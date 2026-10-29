import { Mutex } from 'async-mutex';

// Один mutex на всё приложение: одновременно идёт только один POST /auth/refresh.
// Сервер ротирует refresh-токен и считает повторное использование старого кражей,
// поэтому два параллельных refresh закрыли бы сессию.
const refreshMutex = new Mutex();

/** Пока идёт refresh, новые запросы ждут: иначе они уйдут со старой кукой и получат 401 */
export function waitForRefresh(): Promise<void> {
  return refreshMutex.waitForUnlock();
}

/**
 * Обновляет пару токенов (новые httpOnly-куки ставит сервер).
 * Если refresh уже идёт — просто ждём его окончания и не запускаем второй.
 * Бросает ошибку, если обновить не удалось (refresh истёк → нужно войти заново).
 */
export async function refreshTokens(): Promise<void> {
  if (refreshMutex.isLocked()) {
    await refreshMutex.waitForUnlock();
    return;
  }

  await refreshMutex.runExclusive(() => withCrossTabLock(postRefresh));
}

// Чистый fetch, а не baseQuery: baseQuery сам вызывает refreshTokens при 401
async function postRefresh() {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) throw new Error(`Refresh failed: ${response.status}`);
}

// Mutex защищает только одну вкладку. Куки общие для всех вкладок, поэтому две вкладки
// могли бы одновременно отправить один и тот же старый refresh-токен → сервер закроет сессию.
// Web Locks API ставит общую для всех вкладок очередь: вторая вкладка дождётся первой
// и сделает refresh уже с новой кукой.
async function withCrossTabLock(fn: () => Promise<void>) {
  if (typeof navigator === 'undefined' || !navigator.locks) return fn();
  await navigator.locks.request('auth-refresh', fn);
}
