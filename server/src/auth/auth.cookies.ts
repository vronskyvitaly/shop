import type { CookieOptions, Response } from 'express';

// Префикс shop_: куки привязаны к хосту, а не к порту — на localhost не пересекаются с другими проектами
export const ACCESS_COOKIE = 'shop_access_token';
export const REFRESH_COOKIE = 'shop_refresh_token';

export const ACCESS_TTL_SECONDS = 15 * 60; // 15 минут
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 дней

const base: CookieOptions = {
  httpOnly: true, // JS in the browser cannot read a cookie — protection against XSS
  sameSite: 'lax', // The cookie does not go with requests from other sites — protection against CSRF
  secure: process.env.NODE_ENV === 'production', // in production only over HTTPS
};

// The refresh cookie is sent by the browser only to /auth/*, and not with every request
const accessOptions: CookieOptions = { ...base, path: '/' };

// Под каким путём браузер видит API. Клиент ходит через прокси Next (/api/* → сюда), поэтому для браузера
// refresh — это /api/auth/refresh. '' — к серверу обращаются напрямую (e2e-тесты).
// Читаем при каждом вызове, а не при импорте: .env загружает ConfigModule уже после импорта модулей
const refreshOptions = (): CookieOptions => ({ ...base, path: `${process.env.PUBLIC_API_PREFIX ?? '/api'}/auth` });

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, { ...accessOptions, maxAge: ACCESS_TTL_SECONDS * 1000 });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...refreshOptions(), maxAge: REFRESH_TTL_SECONDS * 1000 });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, accessOptions);
  res.clearCookie(REFRESH_COOKIE, refreshOptions());
}
