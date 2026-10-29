import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FavoritesView } from '@/features/cart/components/favorites-view';
import { ProductGridSkeleton } from '@/features/catalog/components/product-card';

export const metadata: Metadata = { title: 'Избранное' };

export default function FavoritesPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton />}>
      <FavoritesView />
    </Suspense>
  );
}
