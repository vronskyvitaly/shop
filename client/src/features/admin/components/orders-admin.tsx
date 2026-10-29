'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { Pagination } from '@/components/ui/pagination';
import {
  OrderHistory,
  OrderItems,
  OrderProgress,
  OrderSummary,
  StatusBadge,
  cancelReason,
} from '@/features/orders/components/order-parts';
import { getErrorMessage } from '@/lib/api/errors';
import type { Order } from '@/lib/api/types';
import { formatDateTime, formatPrice, itemsLabel } from '@/lib/format';
import { NEXT_STATUSES, STATUS_LABELS, STATUS_STEPS, type OrderStatus } from '@/lib/order-status';
import {
  useGetAdminOrderQuery,
  useGetAdminOrdersQuery,
  useGetReplyTemplatesQuery,
  useUpdateOrderStatusMutation,
} from '../api';
import { AdminSkeleton } from './admin-shell';

const FILTERS: (OrderStatus | undefined)[] = [undefined, ...STATUS_STEPS, 'CANCELLED'];

export function OrdersAdmin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = (searchParams.get('status') as OrderStatus | null) ?? undefined;
  const [page, setPage] = useState(1);
  // Новые заказы появятся сами: RealtimeSync инвалидирует AdminOrders по событию order:created
  const { data, isError, error } = useGetAdminOrdersQuery({ status, page });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Заказы</h1>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter ?? 'all'}
            type="button"
            onClick={() => {
              setPage(1);
              router.replace(filter ? `/admin/orders?status=${filter}` : '/admin/orders');
            }}
            className={`rounded-xl px-3 py-1.5 text-sm ${status === filter ? 'bg-blue-600 text-white' : 'bg-white hover:bg-zinc-50'}`}
          >
            {filter ? STATUS_LABELS[filter] : 'Все'}
          </button>
        ))}
      </div>

      {isError && <FormError message={getErrorMessage(error)} />}
      {!data ? (
        <AdminSkeleton />
      ) : data.items.length === 0 ? (
        <Card className="text-center text-sm text-zinc-500">Заказов нет</Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs text-zinc-500 uppercase">
              <tr>
                <th className="px-4 py-3">№</th>
                <th className="px-4 py-3">Дата</th>
                <th className="px-4 py-3">Покупатель</th>
                <th className="px-4 py-3">Состав</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3 text-right">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {data.items.map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer hover:bg-zinc-50"
                  onClick={() => router.push(`/admin/orders/${order.id}`)}
                >
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/admin/orders/${order.id}`} className="text-blue-600 hover:underline">
                      {order.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-500">{formatDateTime(order.createdAt)}</td>
                  <td className="px-4 py-3">{order.user?.email}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {itemsLabel(order.items.reduce((n, item) => n + item.quantity, 0))}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatPrice(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </div>
  );
}

export function OrderAdmin({ id }: { id: number }) {
  const { data: order, isError, error } = useGetAdminOrderQuery(id);

  if (isError) return <FormError message={getErrorMessage(error)} />;
  if (!order) return <AdminSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/orders" className="text-sm text-blue-600 hover:underline">
          ← Все заказы
        </Link>
        <h1 className="text-2xl font-bold">Заказ №{order.id}</h1>
        <StatusBadge status={order.status} />
        <span className="text-sm text-zinc-500">от {formatDateTime(order.createdAt)}</span>
      </div>

      <Card>
        <OrderProgress status={order.status} cancelReason={cancelReason(order)} />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="mb-2 text-lg font-semibold">Состав заказа</h2>
            <OrderItems items={order.items} />
          </Card>
          <Card>
            <h2 className="mb-2 text-lg font-semibold">Покупатель</h2>
            <p className="text-sm">
              {order.user?.name} · <span className="text-zinc-500">{order.user?.email}</span>
            </p>
            <div className="mt-3">
              <OrderSummary order={order} />
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {/* key: после смены статуса форма начинает заново (пустой комментарий, без режима отмены) */}
          <StatusCard key={order.status} order={order} />
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

const MAX_COMMENT = 300; // как в UpdateOrderStatusDto

function StatusCard({ order }: { order: Order }) {
  const [updateStatus, updateState] = useUpdateOrderStatusMutation();
  const [comment, setComment] = useState('');
  // Отмена — отдельный режим: без причины её не отправить (сервер тоже вернёт 400)
  const [cancelling, setCancelling] = useState(false);

  const next = NEXT_STATUSES[order.status];
  const forward = next.filter((status) => status !== 'CANCELLED');
  const change = (status: OrderStatus) => updateStatus({ id: order.id, status, comment: comment.trim() || undefined });
  const errorMessage = updateState.isError ? getErrorMessage(updateState.error) : undefined;

  if (next.length === 0) {
    return (
      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Сменить статус</h2>
        <p className="text-sm text-zinc-500">Заказ завершён — статус больше не меняется</p>
      </Card>
    );
  }

  if (cancelling) {
    return (
      <Card className="flex flex-col gap-3 ring-2 ring-rose-100">
        <div>
          <h2 className="text-lg font-semibold">Причина отмены</h2>
          <p className="text-sm text-zinc-500">Покупатель увидит её в заказе. Товары вернутся на склад.</p>
        </div>
        <TemplatePicker selected={comment} onPick={setComment} />
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Выберите шаблон или напишите причину"
          aria-label="Причина отмены"
          maxLength={MAX_COMMENT}
          autoFocus
          className="min-h-24 rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
        />
        <p className="-mt-2 text-right text-xs text-zinc-400">
          {comment.length} / {MAX_COMMENT}
        </p>
        <FormError message={errorMessage} />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="danger"
            loading={updateState.isLoading}
            disabled={!comment.trim()}
            onClick={() => change('CANCELLED')}
          >
            Отменить заказ
          </Button>
          <Button
            variant="ghost"
            disabled={updateState.isLoading}
            onClick={() => {
              setCancelling(false);
              setComment('');
              updateState.reset();
            }}
          >
            Назад
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Сменить статус</h2>
      <input
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Комментарий для покупателя (необязательно)"
        aria-label="Комментарий к смене статуса"
        maxLength={MAX_COMMENT}
        className="h-10 rounded-xl border border-zinc-300 px-3 text-sm"
      />
      <FormError message={errorMessage} />
      <div className="flex flex-wrap gap-2">
        {forward.map((status) => (
          <Button key={status} loading={updateState.isLoading} onClick={() => change(status)}>
            → {STATUS_LABELS[status]}
          </Button>
        ))}
        {next.includes('CANCELLED') && (
          <Button
            variant="danger"
            disabled={updateState.isLoading}
            onClick={() => {
              setCancelling(true);
              updateState.reset();
            }}
          >
            Отменить заказ
          </Button>
        )}
      </div>
    </Card>
  );
}

// Шаблоны ответов: клик подставляет текст в поле, его можно дописать перед отправкой
function TemplatePicker({ selected, onPick }: { selected: string; onPick: (text: string) => void }) {
  const { data: templates } = useGetReplyTemplatesQuery();
  if (!templates) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {templates.map((template) => {
          const active = selected === template.text;
          return (
            <button
              key={template.id}
              type="button"
              aria-pressed={active}
              title={template.text}
              onClick={() => onPick(template.text)}
              className={`rounded-full px-3 py-1 text-xs transition ${active ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
            >
              {template.title}
            </button>
          );
        })}
      </div>
      <Link href="/admin/templates" className="self-start text-xs text-blue-600 hover:underline">
        {templates.length === 0 ? 'Шаблонов нет — создать' : 'Настроить шаблоны'}
      </Link>
    </div>
  );
}
