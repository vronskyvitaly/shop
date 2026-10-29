import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MyOrder, OrdersSkeleton } from '@/features/orders/components/my-orders';

export const metadata: Metadata = { title: 'Заказ' };

// params читаем внутри Suspense (cacheComponents): статичная оболочка отдаётся сразу
export default function OrderPage({ params }: PageProps<'/orders/[id]'>) {
  return (
    <Suspense fallback={<OrdersSkeleton />}>
      <OrderRoute params={params} />
    </Suspense>
  );
}

async function OrderRoute({ params }: Pick<PageProps<'/orders/[id]'>, 'params'>) {
  const { id } = await params;
  return <MyOrder id={Number(id)} />;
}
