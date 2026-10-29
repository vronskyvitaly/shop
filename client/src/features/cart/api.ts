import { baseApi } from '@/lib/api/base-api';
import type { Cart, Product } from '@/lib/api/types';

// Сервер на каждую мутацию отвечает корзиной целиком — кладём её в кеш getCart без повторного запроса
const putCart = async (dispatch: (action: unknown) => unknown, queryFulfilled: Promise<{ data: Cart }>) => {
  try {
    const { data } = await queryFulfilled;
    dispatch(cartApi.util.upsertQueryData('getCart', undefined, data));
  } catch {
    // ошибку (например «На складе только 3 шт.») покажет компонент
  }
};

export const cartApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCart: build.query<Cart, void>({
      query: () => '/cart',
      providesTags: ['Cart'],
    }),

    addToCart: build.mutation<Cart, { productId: number; quantity?: number }>({
      query: (body) => ({ url: '/cart/items', method: 'POST', body }),
      onQueryStarted: (_arg, { dispatch, queryFulfilled }) => putCart(dispatch, queryFulfilled),
    }),

    setCartQuantity: build.mutation<Cart, { productId: number; quantity: number }>({
      query: ({ productId, quantity }) => ({ url: `/cart/items/${productId}`, method: 'PATCH', body: { quantity } }),
      onQueryStarted: (_arg, { dispatch, queryFulfilled }) => putCart(dispatch, queryFulfilled),
    }),

    removeFromCart: build.mutation<Cart, number>({
      query: (productId) => ({ url: `/cart/items/${productId}`, method: 'DELETE' }),
      onQueryStarted: (_arg, { dispatch, queryFulfilled }) => putCart(dispatch, queryFulfilled),
    }),

    clearCart: build.mutation<Cart, void>({
      query: () => ({ url: '/cart', method: 'DELETE' }),
      onQueryStarted: (_arg, { dispatch, queryFulfilled }) => putCart(dispatch, queryFulfilled),
    }),
  }),
});

export const {
  useGetCartQuery,
  useAddToCartMutation,
  useSetCartQuantityMutation,
  useRemoveFromCartMutation,
  useClearCartMutation,
} = cartApi;

// ───────── Избранное ─────────

export const favoritesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getFavorites: build.query<Product[], void>({
      query: () => '/favorites',
      providesTags: ['Favorites'],
    }),

    // Оптимистично: сердечко закрашивается сразу, при ошибке — откат
    addFavorite: build.mutation<void, Product>({
      query: (product) => ({ url: `/favorites/${product.id}`, method: 'PUT' }),
      async onQueryStarted(product, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          favoritesApi.util.updateQueryData('getFavorites', undefined, (list) => {
            if (!list.some((p) => p.id === product.id)) list.unshift(product);
          }),
        );
        queryFulfilled.catch(patch.undo);
      },
    }),

    removeFavorite: build.mutation<void, number>({
      query: (productId) => ({ url: `/favorites/${productId}`, method: 'DELETE' }),
      async onQueryStarted(productId, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          favoritesApi.util.updateQueryData('getFavorites', undefined, (list) =>
            list.filter((p) => p.id !== productId),
          ),
        );
        queryFulfilled.catch(patch.undo);
      },
    }),
  }),
});

export const { useGetFavoritesQuery, useAddFavoriteMutation, useRemoveFavoriteMutation } = favoritesApi;
