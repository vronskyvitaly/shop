'use client';

import { Heart, Minus, Plus, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useGetMeQuery } from '@/features/auth/api';
import { getErrorMessage } from '@/lib/api/errors';
import type { Product } from '@/lib/api/types';
import { showToast } from '@/lib/toast';
import {
  useAddFavoriteMutation,
  useAddToCartMutation,
  useGetCartQuery,
  useGetFavoritesQuery,
  useRemoveFavoriteMutation,
  useRemoveFromCartMutation,
  useSetCartQuantityMutation,
} from '../api';

// Гость нажал «В корзину» или «сердечко» → на вход, потом обратно на эту страницу
function useLoginRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  return () => router.push(`/login?next=${encodeURIComponent(pathname)}`);
}

// «В корзину», а если товар уже там — счётчик − 2 +, как на маркетплейсах
export function AddToCartButton({
  product,
  size = 'md',
}: {
  product: Pick<Product, 'id' | 'stock'>;
  size?: 'md' | 'lg';
}) {
  const { data: me } = useGetMeQuery();
  const { data: cart } = useGetCartQuery(undefined, { skip: !me });
  const [add, addState] = useAddToCartMutation();
  const [setQuantity, setState] = useSetCartQuantityMutation();
  const [remove, removeState] = useRemoveFromCartMutation();
  const toLogin = useLoginRedirect();
  const busy = addState.isLoading || setState.isLoading || removeState.isLoading;

  const quantity = cart?.items.find((item) => item.productId === product.id)?.quantity ?? 0;
  const run = async (action: Promise<{ error?: unknown }>) => {
    const { error } = await action;
    if (error) showToast({ title: 'Не получилось', description: getErrorMessage(error as never) });
  };

  if (product.stock === 0) {
    return (
      <Button variant="outline" size={size} disabled className="w-full">
        Нет в наличии
      </Button>
    );
  }

  if (quantity === 0) {
    return (
      <Button
        size={size}
        className="w-full"
        loading={addState.isLoading}
        onClick={() => (me ? run(add({ productId: product.id })) : toLogin())}
      >
        <ShoppingCart className="size-4" aria-hidden />В корзину
      </Button>
    );
  }

  const step = size === 'lg' ? 'size-12' : 'size-10';
  return (
    <div className="flex w-full items-center justify-between rounded-xl bg-blue-50 text-blue-700" aria-busy={busy}>
      <button
        type="button"
        aria-label="Убрать одну штуку"
        disabled={busy}
        className={`flex ${step} items-center justify-center rounded-xl hover:bg-blue-100 disabled:opacity-50`}
        onClick={() =>
          run(quantity > 1 ? setQuantity({ productId: product.id, quantity: quantity - 1 }) : remove(product.id))
        }
      >
        <Minus className="size-4" />
      </button>
      {/* В карточке на телефоне между − и + мало места: «2 шт.», шире и на странице товара — «2 в корзине» */}
      <span className="text-sm font-semibold whitespace-nowrap">
        {quantity}
        {size === 'lg' ? (
          ' в корзине'
        ) : (
          <>
            <span className="sm:hidden"> шт.</span>
            <span className="hidden sm:inline"> в корзине</span>
          </>
        )}
      </span>
      <button
        type="button"
        aria-label="Добавить ещё"
        disabled={busy || quantity >= product.stock}
        className={`flex ${step} items-center justify-center rounded-xl hover:bg-blue-100 disabled:opacity-50`}
        onClick={() => run(setQuantity({ productId: product.id, quantity: quantity + 1 }))}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

// На странице товара: когда он уже в корзине — кнопка перехода к оформлению, как на маркетплейсах
export function GoToCartLink({ productId }: { productId: number }) {
  const { data: me } = useGetMeQuery();
  const { data: cart } = useGetCartQuery(undefined, { skip: !me });
  const inCart = cart?.items.some((item) => item.productId === productId);
  if (!inCart) return null;
  return (
    <Link
      href="/cart"
      className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 text-base font-medium text-white transition hover:bg-blue-700"
    >
      <ShoppingCart className="size-4" aria-hidden />
      Перейти в корзину
    </Link>
  );
}

export function FavoriteButton({ product, className = '' }: { product: Product; className?: string }) {
  const { data: me } = useGetMeQuery();
  const { data: favorites } = useGetFavoritesQuery(undefined, { skip: !me });
  const [addFavorite] = useAddFavoriteMutation();
  const [removeFavorite] = useRemoveFavoriteMutation();
  const toLogin = useLoginRedirect();
  const active = Boolean(favorites?.some((p) => p.id === product.id));

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? 'Убрать из избранного' : 'Добавить в избранное'}
      onClick={(event) => {
        event.preventDefault(); // кнопка внутри ссылки на карточку товара
        if (!me) return toLogin();
        void (active ? removeFavorite(product.id) : addFavorite(product));
      }}
      className={`flex size-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:scale-110 ${className}`}
    >
      <Heart className={`size-5 ${active ? 'fill-rose-500 text-rose-500' : 'text-zinc-500'}`} />
    </button>
  );
}
