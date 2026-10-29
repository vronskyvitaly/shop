'use client';

import { ClipboardList, Package, Users, Wallet } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ProductImage } from '@/components/product-icon';
import { Card } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { StatusBadge } from '@/features/orders/components/order-parts';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDateTime, formatPrice } from '@/lib/format';
import { STATUS_LABELS, STATUS_STEPS } from '@/lib/order-status';
import { useGetAdminStatsQuery } from '../api';
import { AdminSkeleton } from './admin-shell';

export function AdminDashboard() {
  // Цифры обновятся сами: RealtimeSync инвалидирует AdminStats по новым заказам и изменениям каталога
  const { data: stats, isError, error } = useGetAdminStatsQuery();
  if (isError) return <FormError message={getErrorMessage(error)} />;
  if (!stats) return <AdminSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Обзор</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={<Wallet />} label="Выручка (доставленные)" value={formatPrice(stats.revenue)} />
        <StatTile icon={<ClipboardList />} label="Заказов" value={stats.ordersCount} href="/admin/orders" />
        <StatTile
          icon={<Package />}
          label="Товаров"
          value={stats.productsCount}
          hint={stats.hiddenCount ? `${stats.hiddenCount} скрыто` : undefined}
          href="/admin/products"
        />
        <StatTile icon={<Users />} label="Пользователей" value={stats.usersCount} href="/admin/users" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">Заказы по статусам</h2>
          <ul className="flex flex-col gap-2">
            {[...STATUS_STEPS, 'CANCELLED' as const].map((status) => (
              <li key={status}>
                <Link
                  href={`/admin/orders?status=${status}`}
                  className="flex items-center justify-between rounded-xl px-2 py-1 hover:bg-zinc-50"
                >
                  <span className="text-sm">{STATUS_LABELS[status]}</span>
                  <span className="font-semibold">{stats.ordersByStatus[status] ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Заканчиваются на складе</h2>
            <Link href="/admin/products?stock=low" className="text-sm text-blue-600 hover:underline">
              Все →
            </Link>
          </div>
          {stats.lowStock.length === 0 && <p className="text-sm text-zinc-500">Всего достаточно</p>}
          <ul className="flex flex-col gap-2">
            {stats.lowStock.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/admin/products/${product.id}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-1 hover:bg-zinc-50"
                >
                  <ProductImage icon={product.icon} className="w-10" />
                  <span className="line-clamp-1 flex-1 text-sm">{product.title}</span>
                  <span className={`text-sm font-semibold ${product.stock === 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                    {product.stock} шт.
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">Последние заказы</h2>
        {stats.recentOrders.length === 0 && <p className="text-sm text-zinc-500">Заказов пока нет</p>}
        <ul className="flex flex-col divide-y divide-zinc-100">
          {stats.recentOrders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/admin/orders/${order.id}`}
                className="flex flex-wrap items-center gap-3 py-3 hover:text-blue-600"
              >
                <span className="font-medium">№{order.id}</span>
                <StatusBadge status={order.status} />
                <span className="text-sm text-zinc-500">{order.user.email}</span>
                <span className="text-sm text-zinc-400">{formatDateTime(order.createdAt)}</span>
                <span className="ml-auto font-semibold">{formatPrice(order.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
}) {
  const body = (
    <Card className="flex items-center gap-4 transition hover:shadow-md">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 [&>svg]:size-6">
        {icon}
      </span>
      <div>
        <p className="text-sm text-zinc-500">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {hint && <p className="text-xs text-zinc-400">{hint}</p>}
      </div>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
