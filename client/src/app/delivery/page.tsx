import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DeliveryBoard } from '@/features/delivery/components/delivery-board';

// Рабочее место курьера (роль COURIER; админ тоже видит). Показывается только после проверки роли в браузере
export const instant = false;

export const metadata: Metadata = { title: 'Доставка' };

export default function DeliveryPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <DeliveryBoard />
    </Suspense>
  );
}
