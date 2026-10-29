import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CartSkeleton } from '@/features/cart/components/cart-view';
import { Checkout } from '@/features/orders/components/checkout';

export const metadata: Metadata = { title: 'Оформление заказа' };

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CartSkeleton />}>
      <Checkout />
    </Suspense>
  );
}
