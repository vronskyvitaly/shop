import { baseApi } from '@/lib/api/base-api';
import type { User } from '@/lib/api/types';
import { reconnectSocket } from '@/lib/socket/shop-socket';
import type { LoginValues, RegisterValues } from '@/lib/validation/auth.schemas';

// Токены приходят в httpOnly-куках (Set-Cookie), в теле — только пользователь
export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Текущий пользователь. Ошибка = гость (baseQuery уже пытался сделать refresh)
    getMe: build.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['Me'],
    }),

    login: build.mutation<User, LoginValues>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      onQueryStarted: (_values, { dispatch, queryFulfilled }) => signedIn(dispatch, queryFulfilled),
    }),

    register: build.mutation<User, RegisterValues>({
      // confirmPassword только для формы: сервер отклонит лишние поля (forbidNonWhitelisted)
      query: ({ email, name, password }) => ({
        url: '/auth/register',
        method: 'POST',
        body: { email, name, password },
      }),
      onQueryStarted: (_values, { dispatch, queryFulfilled }) => signedIn(dispatch, queryFulfilled),
    }),

    // Ответ — обновлённый пользователь: кладём его в getMe, имя в шапке поменяется сразу
    updateProfile: build.mutation<User, { name: string }>({
      query: (body) => ({ url: '/auth/me', method: 'PATCH', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(authApi.util.upsertQueryData('getMe', undefined, data));
        } catch {
          // ошибку покажет форма
        }
      },
    }),

    changePassword: build.mutation<void, { currentPassword: string; newPassword: string }>({
      query: (body) => ({ url: '/auth/password', method: 'POST', body }),
    }),

    logout: build.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          // Корзина, избранное и заказы прошлого пользователя не должны остаться в кеше
          dispatch(baseApi.util.resetApiState());
          reconnectSocket(); // дальше — гостем
        }
      },
    }),
  }),
});

// Вход/регистрация: сбрасываем кеш гостя, кладём пользователя в getMe без лишнего запроса /auth/me
// и переподключаем сокет уже с куками — чтобы получать события о своих заказах
async function signedIn(dispatch: (action: unknown) => unknown, queryFulfilled: Promise<{ data: User }>) {
  try {
    const { data } = await queryFulfilled;
    dispatch(baseApi.util.resetApiState());
    dispatch(authApi.util.upsertQueryData('getMe', undefined, data));
    reconnectSocket();
  } catch {
    // ошибку покажет форма через isError/error мутации
  }
}

export const {
  useGetMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} = authApi;
