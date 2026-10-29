import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MyOrders, OrdersSkeleton } from '@/features/orders/components/my-orders';

export const metadata: Metadata = { title: 'Мои заказы' };

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersSkeleton />}>
      <MyOrders />
    </Suspense>
  );
}
