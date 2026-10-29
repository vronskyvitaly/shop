import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CartSkeleton, CartView } from '@/features/cart/components/cart-view';

export const metadata: Metadata = { title: 'Корзина' };

export default function CartPage() {
  return (
    <Suspense fallback={<CartSkeleton />}>
      <CartView />
    </Suspense>
  );
}
