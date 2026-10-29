import type { ReactNode } from 'react';
import { Check, CircleX } from 'lucide-react';
import Link from 'next/link';
import { ProductImage } from '@/components/product-icon';
import { Badge } from '@/components/ui/card';
import type { Order } from '@/lib/api/types';
import { formatDateTime, formatPrice } from '@/lib/format';
import {
  DELIVERY_LABELS,
  PAYMENT_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_STEPS,
  type OrderStatus,
} from '@/lib/order-status';

// Общие куски заказа — для покупателя и для админки

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge className={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Badge>;
}

// Причина отмены — комментарий к записи CANCELLED в истории (админ обязан её указать)
export function cancelReason(order: Order): string | null {
  return order.history?.findLast((entry) => entry.status === 'CANCELLED')?.comment ?? null;
}

// Шкала прогресса: Оформлен → Подтверждён → Собирается → В пути → Получен
export function OrderProgress({ status, cancelReason }: { status: OrderStatus; cancelReason?: string | null }) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex gap-2 rounded-xl bg-zinc-100 px-4 py-3 text-sm text-zinc-600">
        <CircleX className="size-5 shrink-0" />
        <div>
          <p className="font-medium">Заказ отменён</p>
          {cancelReason && <p className="mt-0.5 whitespace-pre-line">Причина: {cancelReason}</p>}
        </div>
      </div>
    );
  }
  const current = STATUS_STEPS.indexOf(status);
  return (
    <div className="flex flex-col gap-3">
      <ol className="grid grid-cols-5 gap-1">
        {STATUS_STEPS.map((step, i) => {
          const done = i <= current;
          return (
            <li key={step} className="flex flex-col items-center gap-2 text-center">
              <div className="flex w-full items-center">
                <span
                  className={`h-1 flex-1 rounded ${i === 0 ? 'invisible' : done ? 'bg-blue-600' : 'bg-zinc-200'}`}
                />
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-blue-600 text-white' : 'bg-zinc-200 text-zinc-500'}`}
                >
                  {done ? <Check className="size-4" /> : i + 1}
                </span>
                <span
                  className={`h-1 flex-1 rounded ${i === STATUS_STEPS.length - 1 ? 'invisible' : i < current ? 'bg-blue-600' : 'bg-zinc-200'}`}
                />
              </div>
              {/* На телефоне пять подписей не помещаются в колонки по ~60 px и налезают друг на друга — там они ниже одной строкой */}
              <span
                className={`hidden text-xs sm:block ${i === current ? 'font-semibold text-blue-600' : done ? 'text-zinc-700' : 'text-zinc-400'}`}
              >
                {STATUS_LABELS[step]}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-center text-sm sm:hidden">
        <span className="font-semibold text-blue-600">{STATUS_LABELS[status]}</span>
        <span className="text-zinc-500">
          {' '}
          · шаг {current + 1} из {STATUS_STEPS.length}
        </span>
      </p>
    </div>
  );
}

export function OrderHistory({ history }: { history: NonNullable<Order['history']> }) {
  return (
    <ol className="flex flex-col gap-3 border-l-2 border-zinc-100 pl-4">
      {[...history].reverse().map((entry) => (
        <li key={entry.id} className="relative">
          <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-blue-600" />
          <p className="text-sm font-medium">{STATUS_LABELS[entry.status]}</p>
          <p className="text-xs text-zinc-500">{formatDateTime(entry.createdAt)}</p>
          {entry.comment && <p className="text-sm text-zinc-600">{entry.comment}</p>}
        </li>
      ))}
    </ol>
  );
}

// renderExtra — блок под позицией (на странице заказа покупателя — отзыв о полученном товаре)
export function OrderItems({
  items,
  renderExtra,
}: {
  items: Order['items'];
  renderExtra?: (item: Order['items'][number]) => ReactNode;
}) {
  return (
    <ul className="flex flex-col divide-y divide-zinc-100">
      {items.map((item) => (
        <li key={item.id} className="flex flex-col gap-3 py-3">
          <div className="flex items-center gap-3">
            <div className="w-14 shrink-0">
              <ProductImage icon={item.icon} />
            </div>
            <div className="min-w-0 flex-1">
              {/* Товар могли удалить — тогда остаётся только снимок без ссылки */}
              {item.productId ? (
                <Link href={`/product/${item.productId}`} className="line-clamp-2 text-sm hover:text-blue-600">
                  {item.title}
                </Link>
              ) : (
                <p className="line-clamp-2 text-sm">{item.title}</p>
              )}
              <p className="text-xs text-zinc-500">
                {item.quantity} × {formatPrice(item.price)}
              </p>
            </div>
            <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
          </div>
          {renderExtra?.(item)}
        </li>
      ))}
    </ul>
  );
}

export function OrderSummary({ order }: { order: Order }) {
  return (
    <dl className="flex flex-col gap-2 text-sm">
      <Row label="Получатель" value={`${order.recipientName}, ${order.phone}`} />
      <Row label={DELIVERY_LABELS[order.deliveryMethod]} value={order.address} />
      {order.comment && <Row label="Комментарий" value={order.comment} />}
      <Row
        label="Оплата"
        value={`${PAYMENT_LABELS[order.paymentMethod]} · ${order.isPaid ? 'оплачен' : 'не оплачен'}`}
      />
      <div className="mt-2 flex flex-col gap-1 border-t border-zinc-100 pt-3">
        <Row label="Товары" value={formatPrice(order.itemsTotal)} />
        <Row label="Доставка" value={order.deliveryPrice === 0 ? 'Бесплатно' : formatPrice(order.deliveryPrice)} />
        <div className="flex justify-between text-lg font-bold">
          <dt>Итого</dt>
          <dd>{formatPrice(order.total)}</dd>
        </div>
      </div>
    </dl>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-zinc-500">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
