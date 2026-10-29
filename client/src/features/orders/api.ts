import { baseApi } from '@/lib/api/base-api';
import type { Order, Page } from '@/lib/api/types';
import type { CheckoutValues } from '@/lib/validation/shop.schemas';

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMyOrders: build.query<Page<Order>, { page?: number }>({
      query: (params) => ({ url: '/orders', params }),
      providesTags: ['Orders'],
    }),

    getMyOrder: build.query<Order, number>({
      query: (id) => `/orders/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),

    // Заказ создаётся из корзины на сервере: корзина очищается, остатки товаров меняются
    createOrder: build.mutation<Order, CheckoutValues>({
      query: ({ comment, ...values }) => ({
        url: '/orders',
        method: 'POST',
        body: { ...values, comment: comment || undefined },
      }),
      invalidatesTags: (order) => (order ? ['Orders', 'Cart', 'Products', 'Product'] : []),
    }),

    cancelOrder: build.mutation<Order, number>({
      query: (id) => ({ url: `/orders/${id}/cancel`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => ['Orders', { type: 'Order', id }, 'Products', 'Product'],
    }),
  }),
});

export const { useGetMyOrdersQuery, useGetMyOrderQuery, useCreateOrderMutation, useCancelOrderMutation } = ordersApi;
