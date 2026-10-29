import type { Role } from '@prisma/client';

// Что лежит внутри access-токена. Роль — чтобы RolesGuard не ходил в базу на каждый запрос
// (новая роль начнёт действовать после refresh, т. е. максимум через 15 минут)
export interface AccessPayload {
  sub: number; // id пользователя
  email: string;
  role: Role;
}

// Что лежит внутри refresh-токена
export interface RefreshPayload {
  sub: number; // id пользователя
  sid: number; // id сессии в таблице Session
}

// То, что JwtAuthGuard кладёт в request.user
export interface AuthUser {
  id: number;
  email: string;
  role: Role;
}
