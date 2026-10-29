import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { WarehouseBoard } from '@/features/warehouse/components/warehouse-board';

// Рабочее место сборщика (роль PICKER; админ тоже видит). Показывается только после проверки роли в браузере
export const instant = false;

export const metadata: Metadata = { title: 'Склад' };

export default function WarehousePage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <WarehouseBoard />
    </Suspense>
  );
}
