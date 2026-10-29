import type { Metadata } from 'next';
import { OrdersAdmin } from '@/features/admin/components/orders-admin';

// Админка ничего не показывает, пока в браузере не подтверждена роль ADMIN (AdminShell), поэтому страница
// не попадает в статичную оболочку. Отключаем для неё dev-проверку «мгновенной навигации» Next
export const instant = false;

export const metadata: Metadata = { title: 'Заказы' };

export default function AdminOrdersPage() {
  return <OrdersAdmin />;
}
