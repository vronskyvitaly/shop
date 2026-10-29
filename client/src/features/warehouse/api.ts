import { baseApi } from '@/lib/api/base-api';
import type { PickStats, PickTask } from '@/lib/api/types';

// Склад: доска сборщика. Действия возвращают доску целиком — кладём её в кеш без перезапроса.
// Ошибка (задание взял другой сборщик) — перезапрашиваем доску, чтобы увидеть актуальное
export const warehouseApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPickTasks: build.query<PickTask[], void>({
      query: () => '/warehouse/tasks',
      providesTags: ['PickTasks'],
    }),
    // Свои цифры: сегодня, 7 дней, среднее время. Обновляются по тем же событиям сокета, что и доска
    getPickStats: build.query<PickStats, void>({
      query: () => '/warehouse/stats',
      providesTags: ['PickStats'],
    }),
    takePickTask: build.mutation<PickTask[], number>({
      query: (id) => ({ url: `/warehouse/tasks/${id}/take`, method: 'POST' }),
      onQueryStarted: syncBoard,
      invalidatesTags: (_result, error) => (error ? ['PickTasks', 'PickStats'] : ['PickStats']),
    }),
    completePickTask: build.mutation<PickTask[], number>({
      query: (id) => ({ url: `/warehouse/tasks/${id}/complete`, method: 'POST' }),
      onQueryStarted: syncBoard,
      invalidatesTags: (_result, error) => (error ? ['PickTasks', 'PickStats'] : ['PickStats']),
    }),
  }),
});

async function syncBoard(
  _id: number,
  {
    dispatch,
    queryFulfilled,
  }: { dispatch: (action: unknown) => unknown; queryFulfilled: Promise<{ data: PickTask[] }> },
) {
  const result = await queryFulfilled.catch(() => null);
  if (result) dispatch(warehouseApi.util.upsertQueryData('getPickTasks', undefined, result.data));
}

export const { useGetPickTasksQuery, useGetPickStatsQuery, useTakePickTaskMutation, useCompletePickTaskMutation } =
  warehouseApi;
