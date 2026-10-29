import { baseApi } from '@/lib/api/base-api';
import type { Address, AddressBody } from '@/lib/api/types';

export const addressesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Основной адрес — первым
    getAddresses: build.query<Address[], void>({
      query: () => '/addresses',
      providesTags: ['Addresses'],
    }),
    createAddress: build.mutation<Address, AddressBody>({
      query: (body) => ({ url: '/addresses', method: 'POST', body }),
      invalidatesTags: (address) => (address ? ['Addresses'] : []),
    }),
    updateAddress: build.mutation<Address, { id: number; body: Partial<AddressBody> }>({
      query: ({ id, body }) => ({ url: `/addresses/${id}`, method: 'PATCH', body }),
      invalidatesTags: (address) => (address ? ['Addresses'] : []),
    }),
    // Сервер возвращает весь список (флаг поменялся у двух адресов) — кладём его в кеш без перезапроса
    makeDefaultAddress: build.mutation<Address[], number>({
      query: (id) => ({ url: `/addresses/${id}/default`, method: 'POST' }),
      async onQueryStarted(_id, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled.catch(() => ({ data: null }));
        if (data) dispatch(addressesApi.util.upsertQueryData('getAddresses', undefined, data));
      },
    }),
    deleteAddress: build.mutation<void, number>({
      query: (id) => ({ url: `/addresses/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, error) => (error ? [] : ['Addresses']),
    }),
  }),
});

export const {
  useGetAddressesQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  useMakeDefaultAddressMutation,
  useDeleteAddressMutation,
} = addressesApi;
