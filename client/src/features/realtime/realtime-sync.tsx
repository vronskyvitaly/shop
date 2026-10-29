'use client';

import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useGetMeQuery } from '@/features/auth/api';
import { baseApi } from '@/lib/api/base-api';
import type { ReviewStatus } from '@/lib/api/types';
import { STATUS_LABELS } from '@/lib/order-status';
import { getSocket } from '@/lib/socket/shop-socket';
import type { AppDispatch } from '@/lib/store/store';
import { showToast } from '@/lib/toast';

type Tags = Parameters<typeof baseApi.util.invalidateTags>[0];

// Связывает события сокета с кешем RTK Query: событие → инвалидация тегов → перезапрос того, что на экране.
// Монтируется один раз в корневом layout. Ничего не рендерит
export function RealtimeSync() {
  const dispatch = useDispatch<AppDispatch>();
  const { data: me } = useGetMeQuery();
  // Роль нужна в обработчиках, но переподписываться на сокет при её смене незачем
  const roleRef = useRef(me?.role);
  useEffect(() => {
    roleRef.current = me?.role;
  }, [me?.role]);

  useEffect(() => {
    const socket = getSocket();
    const invalidate = (tags: Tags) => dispatch(baseApi.util.invalidateTags(tags));
    let connectedBefore = false;

    const onConnect = () => {
      // Переподключились — пока были отключены, могли пропустить события
      if (connectedBefore)
        invalidate([
          'Products',
          'Product',
          'Categories',
          'Cart',
          'Favorites',
          'Orders',
          'Order',
          'AdminOrders',
          'AdminStats',
          'Banners',
          'AdminBanners',
          'PickTasks',
          'DeliveryTasks',
          'PickStats',
          'DeliveryStats',
          'MyReviews',
          'AdminReviews',
        ]);
      connectedBefore = true;
    };
    // Админ изменил товары или кто-то купил товар (остаток) — обновляем витрину и админку
    const onCatalog = () =>
      invalidate(['Products', 'Product', 'Categories', 'Cart', 'Favorites', 'Reviews', 'AdminProducts', 'AdminStats']);
    const onBanners = () => invalidate(['Banners', 'AdminBanners']);
    // Новое задание или его взял коллега — доски сборщиков и курьеров обновляются сами
    const onWarehouse = () => invalidate(['PickTasks', 'PickStats']);
    const onDelivery = () => invalidate(['DeliveryTasks', 'DeliveryStats']);
    // Новый или изменённый отзыв ждёт модерации — у админа обновятся очередь и счётчик в меню
    const onReviews = () => invalidate(['AdminReviews', 'AdminStats']);
    // Отзыв проверен: автору — статус и уведомление, витрине — опубликованная версия и рейтинг
    const onReviewModerated = ({ productId, status }: { productId: number; status: ReviewStatus }) => {
      invalidate([
        'MyReviews',
        { type: 'Reviews', id: productId },
        { type: 'Product', id: productId },
        'Products',
        'AdminReviews',
        'AdminStats',
      ]);
      if (roleRef.current === 'ADMIN') return;
      showToast(
        status === 'APPROVED'
          ? {
              title: 'Отзыв опубликован',
              description: 'Спасибо! Его видят другие покупатели',
              href: `/product/${productId}#reviews`,
            }
          : {
              title: 'Отзыв отклонён',
              description: 'Посмотрите причину и исправьте отзыв',
              href: `/product/${productId}#reviews`,
            },
      );
    };
    const onCart = () => invalidate(['Cart']);
    const onFavorites = () => invalidate(['Favorites']);
    const onOrderCreated = ({ id }: { id: number }) => {
      invalidate(['Orders', 'AdminOrders', 'AdminStats']);
      if (roleRef.current === 'ADMIN') showToast({ title: `Новый заказ №${id}`, href: `/admin/orders/${id}` });
    };
    const onOrderUpdated = ({ id, status }: { id: number; status: keyof typeof STATUS_LABELS }) => {
      invalidate(['Orders', { type: 'Order', id }, 'AdminOrders', 'AdminStats', 'Reviews']);
      // Покупателю — уведомление о своём заказе (админ сам меняет статусы, ему не нужно)
      if (roleRef.current === 'USER') {
        showToast({ title: `Заказ №${id}`, description: `Статус: ${STATUS_LABELS[status]}`, href: `/orders/${id}` });
      }
    };

    socket.on('connect', onConnect);
    socket.on('catalog:changed', onCatalog);
    socket.on('banners:changed', onBanners);
    socket.on('warehouse:changed', onWarehouse);
    socket.on('delivery:changed', onDelivery);
    socket.on('reviews:changed', onReviews);
    socket.on('review:moderated', onReviewModerated);
    socket.on('cart:changed', onCart);
    socket.on('favorites:changed', onFavorites);
    socket.on('order:created', onOrderCreated);
    socket.on('order:updated', onOrderUpdated);
    socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('catalog:changed', onCatalog);
      socket.off('banners:changed', onBanners);
      socket.off('warehouse:changed', onWarehouse);
      socket.off('delivery:changed', onDelivery);
      socket.off('reviews:changed', onReviews);
      socket.off('review:moderated', onReviewModerated);
      socket.off('cart:changed', onCart);
      socket.off('favorites:changed', onFavorites);
      socket.off('order:created', onOrderCreated);
      socket.off('order:updated', onOrderUpdated);
      socket.disconnect();
    };
  }, [dispatch]);

  return null;
}
