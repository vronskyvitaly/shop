import {
  fetchBaseQuery,
  retry,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { refreshTokens, waitForRefresh } from './refresh';

// credentials: 'include' — браузер отправляет httpOnly-куки с токенами на другой порт (3000)
const base = fetchBaseQuery({ baseUrl: process.env.NEXT_PUBLIC_API_URL, credentials: 'include' });

// Для этих адресов 401 — это ответ по существу (неверный пароль, refresh истёк),
// повторять их после refresh бессмысленно
const NO_REFRESH_URLS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

const getUrl = (args: string | FetchArgs) => (typeof args === 'string' ? args : args.url);

// Access-токен протух → сервер ответил 401 → обновляем токены (через mutex) → повторяем запрос
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  await waitForRefresh(); // если refresh уже идёт — дожидаемся новых кук
  const result = await base(args, api, extraOptions);

  const shouldRefresh = result.error?.status === 401 && !NO_REFRESH_URLS.some((url) => getUrl(args).startsWith(url));
  if (!shouldRefresh) return result;

  try {
    await refreshTokens();
  } catch {
    return result; // refresh не удался — отдаём исходный 401, страницу на /login переведёт useMeQuery
  }
  return base(args, api, extraOptions); // повторяем один раз
};

// 4xx не исправится повтором (401 уже обработан выше), повторяем только сбои сети/5xx
// и только запросы на чтение: повтор мутации мог бы, например, создать задачу дважды
export const baseQuery = retry(baseQueryWithReauth, {
  retryCondition: (error, _args, { attempt, baseQueryApi }) => {
    const status = (error as FetchBaseQueryError).status;
    const retriable = status === 'FETCH_ERROR' || (typeof status === 'number' && status >= 500);
    return baseQueryApi.type === 'query' && retriable && attempt <= 2;
  },
});
