'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { Role } from '@/lib/api/types';
import { useGetMeQuery } from './api';

/**
 * Для страниц, где нужен вход (корзина, заказы, админка).
 * Гость → на /login?next=<текущая страница>, после входа вернётся обратно.
 * roles: 'ADMIN' или ['PICKER', 'ADMIN'] — пользователя без нужной роли отправляем на главную.
 * Возвращает пользователя, когда он загружен и прошёл проверку, иначе undefined (показываем скелетон)
 */
export function useRequireAuth(roles?: Role | Role[]) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: me, isError } = useGetMeQuery();
  const allowed = roles === undefined ? undefined : Array.isArray(roles) ? roles : [roles];
  const forbidden = Boolean(me && allowed && !allowed.includes(me.role));

  useEffect(() => {
    if (isError) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (forbidden) router.replace('/');
  }, [isError, forbidden, pathname, router]);

  return forbidden ? undefined : me;
}
