'use client';

import { ShoppingCart, Trash } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProductImage } from '@/components/product-icon';
import { Button } from '@/components/ui/button';
import { Card, EmptyState } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { getErrorMessage } from '@/lib/api/errors';
import type { Cart } from '@/lib/api/types';
import { formatPrice, itemsLabel } from '@/lib/format';
import { FREE_DELIVERY_FROM } from '@/lib/order-status';
import { useClearCartMutation, useGetCartQuery, useRemoveFromCartMutation } from '../api';
import { AddToCartButton } from './cart-controls';

export function CartView() {
  const me = useRequireAuth();
  const { data: cart, isError, error } = useGetCartQuery(undefined, { skip: !me });
  const [remove] = useRemoveFromCartMutation();
  const [clear, clearState] = useClearCartMutation();

  if (isError) return <FormError message={getErrorMessage(error)} />;
  if (!cart) return <CartSkeleton />;
  if (cart.items.length === 0) {
    return (
      <EmptyState icon={<ShoppingCart className="size-16" />} title="Корзина пуста">
        <p className="text-sm text-zinc-500">Загляните в каталог — там много интересного</p>
        <Link href="/" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
          Перейти в каталог
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            Корзина <span className="text-zinc-400">{cart.count}</span>
          </h1>
          <Button variant="ghost" size="sm" loading={clearState.isLoading} onClick={() => clear()}>
            Очистить
          </Button>
        </div>
        <ul className="flex flex-col divide-y divide-zinc-100">
          {cart.items.map(({ product, quantity, available }) => (
            <li key={product.id} className={`flex gap-3 py-4 sm:gap-4 ${available ? '' : 'opacity-60'}`}>
              <Link href={`/product/${product.id}`} className="w-20 shrink-0 sm:w-24">
                <ProductImage icon={product.icon} />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={`/product/${product.id}`} className="line-clamp-2 text-sm hover:text-blue-600">
                  {product.brand && <span className="font-medium">{product.brand} / </span>}
                  {product.title}
                </Link>
                {/* На телефоне цена — под названием: справа для неё нет места */}
                <ItemPrice
                  price={product.price}
                  oldPrice={product.oldPrice}
                  quantity={quantity}
                  className="sm:hidden"
                />
                {!available && (
                  <p className="text-xs font-medium text-rose-600">
                    {!product.isActive || product.stock === 0
                      ? 'Товар закончился'
                      : `Доступно только ${product.stock} шт.`}
                  </p>
                )}
                <div className="mt-auto flex items-center gap-2 pt-1 sm:gap-3">
                  <div className="min-w-0 flex-1 sm:w-52 sm:flex-none">
                    <AddToCartButton product={product} />
                  </div>
                  <button
                    type="button"
                    aria-label="Удалить из корзины"
                    onClick={() => remove(product.id)}
                    className="flex shrink-0 items-center gap-1 rounded-lg p-2 text-xs text-zinc-500 hover:bg-rose-50 hover:text-rose-600 sm:p-0 sm:hover:bg-transparent"
                  >
                    <Trash className="size-4" /> <span className="hidden sm:inline">Удалить</span>
                  </button>
                </div>
              </div>
              <ItemPrice
                price={product.price}
                oldPrice={product.oldPrice}
                quantity={quantity}
                className="hidden shrink-0 text-right sm:block"
              />
            </li>
          ))}
        </ul>
      </Card>
      <CartSummary cart={cart} />
    </div>
  );
}

// Сумма по позиции: со скидкой — старая зачёркнута, больше одной штуки — цена за штуку
function ItemPrice({
  price,
  oldPrice,
  quantity,
  className = '',
}: {
  price: number;
  oldPrice: number | null;
  quantity: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="font-bold whitespace-nowrap">
        {formatPrice(price * quantity)}
        {oldPrice && (
          <span className="ml-1.5 text-xs font-normal text-zinc-400 line-through sm:ml-0 sm:block">
            {formatPrice(oldPrice * quantity)}
          </span>
        )}
      </p>
      {quantity > 1 && <p className="text-xs whitespace-nowrap text-zinc-500">{formatPrice(price)} / шт.</p>}
    </div>
  );
}

function CartSummary({ cart }: { cart: Cart }) {
  const router = useRouter();
  const saving = cart.oldItemsTotal - cart.itemsTotal;
  const toFreeDelivery = FREE_DELIVERY_FROM - cart.itemsTotal;

  return (
    <Card className="flex flex-col gap-3 self-start lg:sticky lg:top-24">
      <Button size="lg" className="w-full" disabled={cart.hasUnavailable} onClick={() => router.push('/checkout')}>
        Перейти к оформлению
      </Button>
      {cart.hasUnavailable && (
        <p className="text-xs text-rose-600">
          Уберите из корзины товары, которых нет в наличии, или уменьшите их количество
        </p>
      )}
      <div className="flex justify-between text-lg font-bold">
        <span>Ваша корзина</span>
        <span>{itemsLabel(cart.count)}</span>
      </div>
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-zinc-500">Товары без скидки</dt>
          <dd>{formatPrice(cart.oldItemsTotal)}</dd>
        </div>
        {saving > 0 && (
          <div className="flex justify-between text-rose-600">
            <dt>Скидка</dt>
            <dd>−{formatPrice(saving)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-zinc-100 pt-2 text-lg font-bold">
          <dt>Итого</dt>
          <dd>{formatPrice(cart.itemsTotal)}</dd>
        </div>
      </dl>
      <p className="rounded-xl bg-green-50 px-3 py-2 text-xs text-green-700">
        {toFreeDelivery > 0
          ? `Добавьте товаров на ${formatPrice(toFreeDelivery)} — и доставка курьером будет бесплатной`
          : 'Доставка курьером — бесплатно'}
      </p>
    </Card>
  );
}

export function CartSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
