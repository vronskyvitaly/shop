import { baseApi } from '@/lib/api/base-api';
import type { AdminReview, OwnReview, Page, ReviewStatus } from '@/lib/api/types';
import type { ReviewValues } from '@/lib/validation/shop.schemas';

export type AdminReviewsPage = Page<AdminReview> & { pendingCount: number };

// Отзывы с модерацией: покупатель пишет и правит свой отзыв, админ одобряет или отклоняет.
// Опубликованная версия (витрина, рейтинг) меняется только после одобрения
export const reviewsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Все свои отзывы — на странице заказа у каждого полученного товара виден статус
    getMyReviews: build.query<OwnReview[], void>({
      query: () => '/reviews/mine',
      providesTags: ['MyReviews'],
    }),
    createReview: build.mutation<OwnReview, { productId: number; values: ReviewValues }>({
      query: ({ productId, values }) => ({ url: `/products/${productId}/reviews`, method: 'POST', body: values }),
      invalidatesTags: (_result, error) => (error ? [] : ['MyReviews']),
    }),
    updateReview: build.mutation<OwnReview, { id: number; values: ReviewValues }>({
      query: ({ id, values }) => ({ url: `/reviews/${id}`, method: 'PATCH', body: values }),
      invalidatesTags: (_result, error) => (error ? [] : ['MyReviews']),
    }),

    // ───────── Модерация (админ) ─────────
    getAdminReviews: build.query<AdminReviewsPage, { status: ReviewStatus; page: number }>({
      query: (params) => ({ url: '/admin/reviews', params }),
      providesTags: ['AdminReviews'],
    }),
    // updatedAt — версия, которую видел админ: если автор успел её изменить, сервер вернёт 409
    approveReview: build.mutation<void, Pick<AdminReview, 'id' | 'updatedAt' | 'productId'>>({
      query: ({ id, updatedAt }) => ({ url: `/admin/reviews/${id}/approve`, method: 'POST', body: { updatedAt } }),
      invalidatesTags: (_result, _error, { productId }) => [
        'AdminReviews',
        'AdminStats',
        { type: 'Reviews', id: productId },
        { type: 'Product', id: productId },
        'Products',
      ],
    }),
    rejectReview: build.mutation<void, Pick<AdminReview, 'id' | 'updatedAt'> & { comment: string }>({
      query: ({ id, updatedAt, comment }) => ({
        url: `/admin/reviews/${id}/reject`,
        method: 'POST',
        body: { updatedAt, comment },
      }),
      invalidatesTags: ['AdminReviews', 'AdminStats'],
    }),
  }),
});

export const {
  useGetMyReviewsQuery,
  useCreateReviewMutation,
  useUpdateReviewMutation,
  useGetAdminReviewsQuery,
  useApproveReviewMutation,
  useRejectReviewMutation,
} = reviewsApi;
