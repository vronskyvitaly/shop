import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminSkeleton } from '@/features/admin/components/admin-shell';
import { OrderAdmin } from '@/features/admin/components/orders-admin';

// Админка ничего не показывает, пока в браузере не подтверждена роль ADMIN (AdminShell), поэтому
// страница с [id] не попадает в статичную оболочку. Отключаем для неё dev-проверку «мгновенной навигации»
export const instant = false;

export const metadata: Metadata = { title: 'Заказ' };

export default function AdminOrderPage({ params }: PageProps<'/admin/orders/[id]'>) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminOrderRoute params={params} />
    </Suspense>
  );
}

async function AdminOrderRoute({ params }: Pick<PageProps<'/admin/orders/[id]'>, 'params'>) {
  const { id } = await params;
  return <OrderAdmin id={Number(id)} />;
}
