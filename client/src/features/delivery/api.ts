import { baseApi } from '@/lib/api/base-api';
import type { DeliveryStats, DeliveryTask } from '@/lib/api/types';

// Доставка: доска курьера. Как у склада: действия возвращают доску целиком, при ошибке — перезапрос
export const deliveryApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDeliveryTasks: build.query<DeliveryTask[], void>({
      query: () => '/delivery/tasks',
      providesTags: ['DeliveryTasks'],
    }),
    // Свои цифры: сегодня, 7 дней, среднее время. Обновляются по тем же событиям сокета, что и доска
    getDeliveryStats: build.query<DeliveryStats, void>({
      query: () => '/delivery/stats',
      providesTags: ['DeliveryStats'],
    }),
    takeDeliveryTask: build.mutation<DeliveryTask[], number>({
      query: (id) => ({ url: `/delivery/tasks/${id}/take`, method: 'POST' }),
      onQueryStarted: syncBoard,
      invalidatesTags: (_result, error) => (error ? ['DeliveryTasks', 'DeliveryStats'] : ['DeliveryStats']),
    }),
    completeDeliveryTask: build.mutation<DeliveryTask[], number>({
      query: (id) => ({ url: `/delivery/tasks/${id}/complete`, method: 'POST' }),
      onQueryStarted: syncBoard,
      invalidatesTags: (_result, error) => (error ? ['DeliveryTasks', 'DeliveryStats'] : ['DeliveryStats']),
    }),
  }),
});

async function syncBoard(
  _id: number,
  {
    dispatch,
    queryFulfilled,
  }: { dispatch: (action: unknown) => unknown; queryFulfilled: Promise<{ data: DeliveryTask[] }> },
) {
  const result = await queryFulfilled.catch(() => null);
  if (result) dispatch(deliveryApi.util.upsertQueryData('getDeliveryTasks', undefined, result.data));
}

export const {
  useGetDeliveryTasksQuery,
  useGetDeliveryStatsQuery,
  useTakeDeliveryTaskMutation,
  useCompleteDeliveryTaskMutation,
} = deliveryApi;
