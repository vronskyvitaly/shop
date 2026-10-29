import { Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';

// Пароль никогда не отдаём наружу
const withoutPassword = { password: true } as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsers() {
    const users = await this.prisma.user.findMany({ omit: withoutPassword });
    return users;
  }

  async getUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      omit: withoutPassword,
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async createUser(data: CreateUserDto) {
    const user = await this.prisma.user.create({
      data: { ...data, password: await hash(data.password, 10) },
      omit: withoutPassword,
    });
    return user;
  }

  updateProfile(id: number, name: string) {
    return this.prisma.user.update({ where: { id }, data: { name }, omit: withoutPassword });
  }

  // Только для входа: единственное место, где нужен хеш пароля
  findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }
}
