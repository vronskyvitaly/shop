'use client';

import { CircleCheck, Package } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProductImage } from '@/components/product-icon';
import { Button } from '@/components/ui/button';
import { Card, EmptyState } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { useGetMyReviewsQuery } from '@/features/reviews/api';
import { MyReview } from '@/features/reviews/components/my-review';
import { getErrorMessage } from '@/lib/api/errors';
import type { Order } from '@/lib/api/types';
import { formatDateTime, formatPrice, itemsLabel } from '@/lib/format';
import { USER_CANCEL_WINDOW_MS, USER_CANCELLABLE } from '@/lib/order-status';
import { useCancelOrderMutation, useGetMyOrderQuery, useGetMyOrdersQuery } from '../api';
import { OrderHistory, OrderItems, OrderProgress, OrderSummary, StatusBadge, cancelReason } from './order-parts';

// Сколько позиций показать в карточке заказа в списке; остальные — «и ещё N товаров»
const PREVIEW_ITEMS = 3;

export function MyOrders() {
  const me = useRequireAuth();
  const [page, setPage] = useState(1);
  const { data, isError, error } = useGetMyOrdersQuery({ page }, { skip: !me });

  if (isError) return <FormError message={getErrorMessage(error)} />;
  if (!data) return <OrdersSkeleton />;
  if (data.total === 0) {
    return (
      <EmptyState icon={<Package className="size-16" />} title="Заказов пока нет">
        <Link href="/" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
          Перейти в каталог
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Мои заказы</h1>
      {data.items.map((order) => (
        <Link key={order.id} href={`/orders/${order.id}`} className="block">
          <Card className="flex flex-col gap-3 transition hover:shadow-md">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-semibold">Заказ №{order.id}</h2>
              <StatusBadge status={order.status} />
              <span className="text-sm text-zinc-500">от {formatDateTime(order.createdAt)}</span>
              <span className="ml-auto font-bold">{formatPrice(order.total)}</span>
            </div>
            <ul className="flex flex-col gap-2">
              {order.items.slice(0, PREVIEW_ITEMS).map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <ProductImage icon={item.icon} className="w-10 shrink-0" />
                  <span className="line-clamp-1 min-w-0 flex-1 text-sm">{item.title}</span>
                  <span className="shrink-0 text-sm text-zinc-500">× {item.quantity}</span>
                </li>
              ))}
            </ul>
            {order.items.length > PREVIEW_ITEMS && (
              <p className="text-sm text-zinc-500">и ещё {itemsLabel(order.items.length - PREVIEW_ITEMS)}</p>
            )}
          </Card>
        </Link>
      ))}
      <Pagination page={data.page} pages={data.pages} onChange={setPage} />
    </div>
  );
}

export function MyOrder({ id }: { id: number }) {
  const me = useRequireAuth();
  const searchParams = useSearchParams();
  // Статус обновится сам: RealtimeSync инвалидирует тег Order по событию order:updated
  const { data: order, isError, error } = useGetMyOrderQuery(id, { skip: !me });

  if (isError) return <FormError message={getErrorMessage(error)} />;
  if (!order) return <OrdersSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      {searchParams.get('created') && (
        <p className="flex items-center gap-2 rounded-2xl bg-green-50 px-5 py-4 text-green-800">
          <CircleCheck className="size-5" /> Спасибо! Заказ оформлен — мы сообщим, когда статус изменится
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Заказ №{order.id}</h1>
        <StatusBadge status={order.status} />
        <span className="text-sm text-zinc-500">от {formatDateTime(order.createdAt)}</span>
      </div>

      <Card>
        <OrderProgress status={order.status} cancelReason={cancelReason(order)} />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Состав заказа</h2>
          {/* Получил заказ — у каждого товара можно оставить отзыв (он уйдёт на модерацию) */}
          <OrderItems
            items={order.items}
            renderExtra={order.status === 'DELIVERED' ? (item) => <ItemReview productId={item.productId} /> : undefined}
          />
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <OrderSummary order={order} />
            {USER_CANCELLABLE.includes(order.status) && <CancelOrder order={order} />}
          </Card>
          {order.history && (
            <Card>
              <h2 className="mb-3 text-lg font-semibold">История</h2>
              <OrderHistory history={order.history} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export function OrdersSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  );
}

// Отмена покупателем — только в первые 15 минут после оформления (сервер проверяет то же самое).
// Кнопка показывает, сколько осталось, и сама исчезает, когда время вышло
function CancelOrder({ order }: { order: Order }) {
  const [cancel, cancelState] = useCancelOrderMutation();
  const deadline = new Date(order.createdAt).getTime() + USER_CANCEL_WINDOW_MS;
  // «Сейчас» обновляется раз в секунду — для обратного отсчёта. Ленивый useState: Date.now() не в рендере
  const [now, setNow] = useState(() => Date.now());
  const left = deadline - now;
  const expired = left <= 0;

  // Таймер тикает, пока время не вышло
  useEffect(() => {
    if (expired) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expired]);

  if (expired) {
    return (
      <p className="mt-4 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
        Отменить заказ можно было в течение 15 минут после оформления. Если что-то не так — напишите в поддержку
      </p>
    );
  }

  const minutes = Math.floor(left / 60_000);
  const seconds = String(Math.floor((left % 60_000) / 1000)).padStart(2, '0');
  return (
    <div className="mt-4 flex flex-col gap-2">
      <FormError message={cancelState.isError ? getErrorMessage(cancelState.error) : undefined} />
      <Button
        variant="danger"
        loading={cancelState.isLoading}
        onClick={() => {
          if (confirm('Отменить заказ?')) void cancel(order.id);
        }}
      >
        Отменить заказ
      </Button>
      <p className="text-center text-xs text-zinc-500">
        Отменить можно ещё{' '}
        <span className="font-medium text-zinc-700 tabular-nums">
          {minutes}:{seconds}
        </span>
      </p>
    </div>
  );
}

// Отзыв о товаре из полученного заказа. Все свои отзывы — одним запросом (RTK Query кеширует его для всех позиций)
function ItemReview({ productId }: { productId: number | null }) {
  const { data: reviews } = useGetMyReviewsQuery();
  if (!productId || !reviews) return null; // товар удалён из каталога — отзыв оставить некуда
  return <MyReview productId={productId} review={reviews.find((review) => review.productId === productId) ?? null} />;
}
