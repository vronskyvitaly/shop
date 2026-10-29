import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ACCESS_COOKIE } from './auth.cookies.js';
import type { AccessPayload, AuthUser } from './auth.types.js';

// Пропускает запрос, только если в куке shop_access_token лежит валидный токен
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token: string | undefined = req.cookies?.[ACCESS_COOKIE];
    if (!token) throw new UnauthorizedException('Not authenticated');

    try {
      const payload = await this.jwt.verifyAsync<AccessPayload>(token, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      });
      req.user = { id: payload.sub, email: payload.email, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException('Access token is invalid or expired');
    }
  }
}
