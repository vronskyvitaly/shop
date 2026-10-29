import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';
import type { Request } from 'express';
import type { AuthUser } from './auth.types.js';

const ROLES_KEY = 'roles';

// @Roles('ADMIN') — доступ только для этих ролей. Ставится вместе с JwtAuthGuard:
// @UseGuards(JwtAuthGuard, RolesGuard) — сначала проверяем токен, потом роль
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Роли с метода важнее ролей с класса контроллера
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;

    const user = context.switchToHttp().getRequest<Request & { user?: AuthUser }>().user;
    // 403, а не 401: пользователь вошёл, но прав не хватает — refresh тут не поможет
    if (!user || !roles.includes(user.role)) throw new ForbiddenException('Недостаточно прав');
    return true;
  }
}
