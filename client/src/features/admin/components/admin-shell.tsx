'use client';

import {
  ChartColumn,
  ClipboardList,
  GalleryHorizontal,
  MessageSquareText,
  Package,
  Star,
  Tags,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { useGetAdminStatsQuery } from '../api';

const NAV = [
  { href: '/admin', label: 'Обзор', icon: ChartColumn },
  { href: '/admin/orders', label: 'Заказы', icon: ClipboardList },
  { href: '/admin/products', label: 'Товары', icon: Package },
  { href: '/admin/categories', label: 'Категории', icon: Tags },
  { href: '/admin/banners', label: 'Баннеры', icon: GalleryHorizontal },
  { href: '/admin/reviews', label: 'Отзывы', icon: Star },
  { href: '/admin/users', label: 'Пользователи', icon: Users },
  { href: '/admin/templates', label: 'Шаблоны ответов', icon: MessageSquareText },
];

// Рабочие места сотрудников — вне админки, у сборщика и курьера свой интерфейс
const STAFF = [
  { href: '/warehouse', label: 'Склад', icon: Warehouse },
  { href: '/delivery', label: 'Доставка', icon: Truck },
];

// Каркас админки: доступ только для ADMIN. Сервер всё равно проверяет роль на каждом запросе (RolesGuard),
// здесь — только чтобы не показывать покупателю пустые экраны с ошибкой 403
export function AdminShell({ children }: { children: ReactNode }) {
  const me = useRequireAuth('ADMIN');
  const pathname = usePathname();
  // Счётчик отзывов на модерации в меню. Обновляется сам: reviews:changed инвалидирует AdminStats
  const { data: stats } = useGetAdminStatsQuery(undefined, { skip: !me });

  // Пока роль не подтверждена — ни меню, ни содержимого
  if (!me) return <AdminSkeleton />;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-1 self-start rounded-2xl bg-white p-3 shadow-sm md:sticky md:top-24">
        <p className="px-3 py-2 text-xs font-semibold tracking-wider text-zinc-400 uppercase">Админ-панель</p>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/admin' ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${active ? 'bg-blue-50 font-medium text-blue-700' : 'hover:bg-zinc-100'}`}
            >
              <Icon className="size-5" /> {label}
              {href === '/admin/reviews' && Boolean(stats?.pendingReviews) && (
                <span className="ml-auto rounded-full bg-amber-100 px-2 text-xs font-semibold text-amber-800">
                  {stats!.pendingReviews}
                </span>
              )}
            </Link>
          );
        })}
        <p className="mt-2 px-3 py-2 text-xs font-semibold tracking-wider text-zinc-400 uppercase">Сотрудникам</p>
        {STAFF.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-zinc-100"
          >
            <Icon className="size-5" /> {label}
          </Link>
        ))}
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function AdminSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
