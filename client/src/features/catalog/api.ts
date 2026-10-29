import { baseApi } from '@/lib/api/base-api';
import type { Banner, CategoryWithCount, OwnReview, Page, Product, ProductsQuery, Review } from '@/lib/api/types';

export const catalogApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Только видимые сейчас: включённые и в периоде показа
    getBanners: build.query<Banner[], void>({
      query: () => '/banners',
      providesTags: ['Banners'],
    }),

    getCategories: build.query<CategoryWithCount[], void>({
      query: () => '/categories',
      providesTags: ['Categories'],
    }),

    // Каждая комбинация фильтров — отдельная запись в кеше: «Назад» показывает прошлую страницу мгновенно
    getProducts: build.query<Page<Product>, ProductsQuery>({
      query: (params) => ({ url: '/products', params }),
      providesTags: ['Products'],
    }),

    getProduct: build.query<Product, number>({
      query: (id) => `/products/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),

    getReviews: build.query<Review[], number>({
      query: (productId) => `/products/${productId}/reviews`,
      providesTags: (_result, _error, productId) => [{ type: 'Reviews', id: productId }],
    }),

    // Можно ли оставить отзыв (только после получения товара) и свой отзыв, если он уже есть
    getReviewEligibility: build.query<{ canReview: boolean; purchased: boolean; review: OwnReview | null }, number>({
      query: (productId) => `/products/${productId}/reviews/eligibility`,
      providesTags: (_result, _error, productId) => [{ type: 'Reviews', id: productId }, 'MyReviews'],
    }),
  }),
});

export const {
  useGetBannersQuery,
  useGetCategoriesQuery,
  useGetProductsQuery,
  useGetProductQuery,
  useGetReviewsQuery,
  useGetReviewEligibilityQuery,
} = catalogApi;
