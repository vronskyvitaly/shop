import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './base-query';

// Один API на всё приложение. Фичи добавляют свои эндпоинты через baseApi.injectEndpoints,
// а связь между ними — через теги: мутация инвалидирует тег → запросы с этим тегом перезапрашиваются.
// Те же теги инвалидирует RealtimeSync по событиям сокета (изменения из других вкладок и от админа)
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [
    'Me',
    'Categories',
    'Products', // списки каталога
    'Product', // карточка товара, id = productId
    'Reviews', // id = productId
    'Cart',
    'Favorites',
    'Orders', // мои заказы (список)
    'Order', // мой заказ, id = orderId
    'Addresses', // мои адреса доставки
    'AdminStats',
    'AdminProducts',
    'AdminOrders',
    'AdminUsers',
    'ReplyTemplates',
    'Banners', // карусель на главной
    'AdminBanners',
    'PickTasks', // доска сборщика
    'DeliveryTasks', // доска курьера
    'MyReviews', // мои отзывы и их статусы модерации
    'AdminReviews', // очередь модерации отзывов
    'PickStats', // статистика сборщика
    'DeliveryStats', // статистика курьера
  ],
  // Данные старше 30 с перезапрашиваются при новом монтировании компонента
  refetchOnMountOrArgChange: 30,
  // Ревалидация при возврате на вкладку и восстановлении сети (нужен setupListeners в store)
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
