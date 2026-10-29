import { baseApi } from '@/lib/api/base-api';
import type {
  Banner,
  BannerBody,
  Category,
  Order,
  Page,
  Product,
  ProductsQuery,
  ReplyTemplate,
  Role,
  StockFilter,
  User,
} from '@/lib/api/types';
import type { OrderStatus } from '@/lib/order-status';

export interface AdminStats {
  productsCount: number;
  hiddenCount: number;
  usersCount: number;
  ordersCount: number;
  ordersByStatus: Partial<Record<OrderStatus, number>>;
  revenue: number;
  lowStock: { id: number; title: string; icon: string; stock: number }[];
  recentOrders: (Order & { user: { email: string; name: string | null } })[];
  pendingReviews: number; // отзывы на модерации
}

export type ProductBody = {
  title: string;
  description: string;
  brand: string | null;
  price: number;
  oldPrice: number | null;
  stock: number;
  icon: string;
  categoryId: number;
  isActive: boolean;
};

// Изменение товара видно и в админке, и на витрине (каталог, карточка, корзина, избранное)
const PRODUCT_TAGS = ['AdminProducts', 'AdminStats', 'Products', 'Categories', 'Cart', 'Favorites'] as const;

// Баннеры видны и в админке, и в карусели на главной
const BANNER_TAGS = ['AdminBanners', 'Banners'] as const;

export const adminApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminStats: build.query<AdminStats, void>({
      query: () => '/admin/stats',
      providesTags: ['AdminStats'],
    }),

    // ───────── Товары ─────────
    getAdminProducts: build.query<Page<Product>, ProductsQuery & { stock?: StockFilter }>({
      query: (params) => ({ url: '/admin/products', params }),
      providesTags: ['AdminProducts'],
    }),
    getAdminProduct: build.query<Product, number>({
      query: (id) => `/admin/products/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),
    createProduct: build.mutation<Product, ProductBody>({
      query: (body) => ({ url: '/admin/products', method: 'POST', body }),
      invalidatesTags: (product) => (product ? [...PRODUCT_TAGS] : []),
    }),
    updateProduct: build.mutation<Product, { id: number; body: Partial<ProductBody> }>({
      query: ({ id, body }) => ({ url: `/admin/products/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, error, { id }) => (error ? [] : [...PRODUCT_TAGS, { type: 'Product', id }]),
    }),
    deleteProduct: build.mutation<void, number>({
      query: (id) => ({ url: `/admin/products/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, error, id) => (error ? [] : [...PRODUCT_TAGS, { type: 'Product', id }]),
    }),

    // ───────── Категории ─────────
    createCategory: build.mutation<Category, Omit<Category, 'id'>>({
      query: (body) => ({ url: '/admin/categories', method: 'POST', body }),
      invalidatesTags: (category) => (category ? ['Categories'] : []),
    }),
    updateCategory: build.mutation<Category, Category>({
      query: ({ id, ...body }) => ({ url: `/admin/categories/${id}`, method: 'PATCH', body }),
      invalidatesTags: (category) => (category ? ['Categories', 'Products', 'AdminProducts'] : []),
    }),
    deleteCategory: build.mutation<void, number>({
      query: (id) => ({ url: `/admin/categories/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, error) => (error ? [] : ['Categories']),
    }),

    // ───────── Заказы ─────────
    getAdminOrders: build.query<Page<Order>, { status?: OrderStatus; page?: number }>({
      query: (params) => ({ url: '/admin/orders', params }),
      providesTags: ['AdminOrders'],
    }),
    getAdminOrder: build.query<Order, number>({
      query: (id) => `/admin/orders/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),
    updateOrderStatus: build.mutation<Order, { id: number; status: OrderStatus; comment?: string }>({
      query: ({ id, ...body }) => ({ url: `/admin/orders/${id}/status`, method: 'PATCH', body }),
      invalidatesTags: (_result, error, { id }) =>
        error ? [] : ['AdminOrders', 'AdminStats', { type: 'Order', id }, 'Products', 'AdminProducts'],
    }),

    // ───────── Баннеры ─────────
    getAdminBanners: build.query<Banner[], void>({
      query: () => '/admin/banners',
      providesTags: ['AdminBanners'],
    }),
    getAdminBanner: build.query<Banner, number>({
      query: (id) => `/admin/banners/${id}`,
      providesTags: ['AdminBanners'],
    }),
    createBanner: build.mutation<Banner, BannerBody>({
      query: (body) => ({ url: '/admin/banners', method: 'POST', body }),
      invalidatesTags: (banner) => (banner ? [...BANNER_TAGS] : []),
    }),
    updateBanner: build.mutation<Banner, { id: number; body: Partial<BannerBody> }>({
      query: ({ id, body }) => ({ url: `/admin/banners/${id}`, method: 'PATCH', body }),
      invalidatesTags: (banner) => (banner ? [...BANNER_TAGS] : []),
    }),
    deleteBanner: build.mutation<void, number>({
      query: (id) => ({ url: `/admin/banners/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, error) => (error ? [] : [...BANNER_TAGS]),
    }),
    // ids — в новом порядке. Список в кеше меняем сразу, не дожидаясь ответа: стрелки ↑↓ срабатывают мгновенно
    reorderBanners: build.mutation<Banner[], number[]>({
      query: (ids) => ({ url: '/admin/banners/order', method: 'PUT', body: { ids } }),
      async onQueryStarted(ids, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApi.util.updateQueryData('getAdminBanners', undefined, (banners) =>
            ids.map((id) => banners.find((b) => b.id === id)).filter((b) => b !== undefined),
          ),
        );
        queryFulfilled.catch(patch.undo);
      },
      invalidatesTags: ['Banners'],
    }),

    // ───────── Шаблоны ответов ─────────
    getReplyTemplates: build.query<ReplyTemplate[], void>({
      query: () => '/admin/reply-templates',
      providesTags: ['ReplyTemplates'],
    }),
    createReplyTemplate: build.mutation<ReplyTemplate, Omit<ReplyTemplate, 'id'>>({
      query: (body) => ({ url: '/admin/reply-templates', method: 'POST', body }),
      invalidatesTags: (template) => (template ? ['ReplyTemplates'] : []),
    }),
    updateReplyTemplate: build.mutation<ReplyTemplate, ReplyTemplate>({
      query: ({ id, ...body }) => ({ url: `/admin/reply-templates/${id}`, method: 'PATCH', body }),
      invalidatesTags: (template) => (template ? ['ReplyTemplates'] : []),
    }),
    deleteReplyTemplate: build.mutation<void, number>({
      query: (id) => ({ url: `/admin/reply-templates/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, error) => (error ? [] : ['ReplyTemplates']),
    }),

    // ───────── Пользователи ─────────
    getAdminUsers: build.query<Page<User & { ordersCount: number }>, { search?: string; page?: number }>({
      query: (params) => ({ url: '/admin/users', params }),
      providesTags: ['AdminUsers'],
    }),
    updateUserRole: build.mutation<User, { id: number; role: Role }>({
      query: ({ id, role }) => ({ url: `/admin/users/${id}/role`, method: 'PATCH', body: { role } }),
      invalidatesTags: (_result, error) => (error ? [] : ['AdminUsers']),
    }),
  }),
});

export const {
  useGetAdminStatsQuery,
  useGetAdminProductsQuery,
  useGetAdminProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetAdminOrdersQuery,
  useGetAdminOrderQuery,
  useUpdateOrderStatusMutation,
  useGetAdminBannersQuery,
  useGetAdminBannerQuery,
  useCreateBannerMutation,
  useUpdateBannerMutation,
  useDeleteBannerMutation,
  useReorderBannersMutation,
  useGetReplyTemplatesQuery,
  useCreateReplyTemplateMutation,
  useUpdateReplyTemplateMutation,
  useDeleteReplyTemplateMutation,
  useGetAdminUsersQuery,
  useUpdateUserRoleMutation,
} = adminApi;
