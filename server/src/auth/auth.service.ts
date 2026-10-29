import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from '../users/dto/create-user.dto.js';
import { UsersService } from '../users/users.service.js';
import { ACCESS_TTL_SECONDS, REFRESH_TTL_SECONDS } from './auth.cookies.js';
import type { AccessPayload, RefreshPayload } from './auth.types.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/profile.dto.js';

// Что нужно, чтобы выпустить пару токенов
type TokenUser = { id: number; email: string; role: Role };

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

// Refresh-токен длинный и случайный, поэтому для хранения хватает SHA-256
// (bcrypt здесь не подходит: он учитывает только первые 72 байта, а JWT длиннее)
function sha256(value: string) {
  return createHash('sha256').update(value).digest();
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: CreateUserDto) {
    const user = await this.users.createUser(dto);
    const tokens = await this.createSession(user);
    return { user, tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithPassword(dto.email);
    // Одинаковая ошибка для «нет такого email» и «неверный пароль»,
    // чтобы нельзя было подбором узнать, какие email зарегистрированы
    if (!user || !(await compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const { password: _password, ...safeUser } = user;
    const tokens = await this.createSession(user);
    return { user: safeUser, tokens };
  }

  // Ротация: старый refresh-токен становится недействительным, выдаётся новая пара
  async refresh(refreshToken: string | undefined): Promise<Tokens> {
    const payload = await this.verifyRefresh(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: { user: { select: { id: true, email: true, role: true } } },
    });

    if (!session || session.userId !== payload.sub || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    const expected = Buffer.from(session.tokenHash, 'hex');
    const actual = sha256(refreshToken!);
    const hashMatches = expected.length === actual.length && timingSafeEqual(actual, expected);
    if (!hashMatches) {
      // Токен подписан верно, но уже был заменён — его кто-то переиспользует. Закрываем сессию.
      await this.prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    return this.rotate(session.id, session.user);
  }

  // 400, а не 401 на неверный пароль: на 401 клиент решил бы, что истёк токен, и пошёл бы делать refresh
  async changePassword(userId: number, dto: ChangePasswordDto, refreshToken: string | undefined) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await compare(dto.currentPassword, user.password))) {
      throw new BadRequestException('Неверный текущий пароль');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { password: await hash(dto.newPassword, 10) } });

    // Пароль меняют, в том числе если боятся, что его узнали: закрываем все сессии, кроме текущей.
    // Нет валидной refresh-куки — закрываем все (текущая доживёт до конца access-токена, потом — вход заново)
    const currentSessionId = await this.verifyRefresh(refreshToken).then(
      (payload) => payload.sid,
      () => undefined,
    );
    await this.prisma.session.deleteMany({
      where: { userId, ...(currentSessionId ? { id: { not: currentSessionId } } : {}) },
    });
  }

  async logout(refreshToken: string | undefined) {
    try {
      const payload = await this.verifyRefresh(refreshToken);
      await this.prisma.session.deleteMany({ where: { id: payload.sid, userId: payload.sub } });
    } catch {
      // Токен битый или истёк — выходим всё равно, куки очистит контроллер
    }
  }

  private async createSession(user: TokenUser): Promise<Tokens> {
    const session = await this.prisma.session.create({
      data: { userId: user.id, tokenHash: '', expiresAt: this.refreshExpiresAt() },
    });
    return this.rotate(session.id, user);
  }

  private async rotate(sessionId: number, user: TokenUser): Promise<Tokens> {
    const accessPayload: AccessPayload = { sub: user.id, email: user.email, role: user.role };
    const refreshPayload: RefreshPayload = { sub: user.id, sid: sessionId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: ACCESS_TTL_SECONDS,
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: REFRESH_TTL_SECONDS,
        // iat в JWT — с точностью до секунды: без случайного jti два refresh за одну секунду
        // выдали бы одинаковый токен, и «старый» токен остался бы валидным
        jwtid: randomUUID(),
      }),
    ]);

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { tokenHash: sha256(refreshToken).toString('hex'), expiresAt: this.refreshExpiresAt() },
    });

    return { accessToken, refreshToken };
  }

  private async verifyRefresh(token: string | undefined): Promise<RefreshPayload> {
    if (!token) throw new UnauthorizedException('No refresh token');
    try {
      return await this.jwt.verifyAsync<RefreshPayload>(token, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
  }

  private refreshExpiresAt() {
    return new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);
  }
}
