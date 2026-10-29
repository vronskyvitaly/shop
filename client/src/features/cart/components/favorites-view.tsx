'use client';

import { Heart } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { ProductCard, ProductGridSkeleton } from '@/features/catalog/components/product-card';
import { getErrorMessage } from '@/lib/api/errors';
import { itemsLabel } from '@/lib/format';
import { useGetFavoritesQuery } from '../api';

export function FavoritesView() {
  const me = useRequireAuth();
  const { data: favorites, isError, error } = useGetFavoritesQuery(undefined, { skip: !me });

  if (isError) return <FormError message={getErrorMessage(error)} />;
  if (!favorites) return <ProductGridSkeleton />;
  if (favorites.length === 0) {
    return (
      <EmptyState icon={<Heart className="size-16" />} title="В избранном пока пусто">
        <p className="text-sm text-zinc-500">Нажмите на сердечко у товара, чтобы сохранить его здесь</p>
        <Link href="/" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
          Перейти в каталог
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">
        Избранное <span className="text-base font-normal text-zinc-400">{itemsLabel(favorites.length)}</span>
      </h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {favorites.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
