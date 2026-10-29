import Link from 'next/link';
import { Price, Rating } from '@/components/price';
import { ProductImage } from '@/components/product-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { AddToCartButton, FavoriteButton } from '@/features/cart/components/cart-controls';
import type { Product } from '@/lib/api/types';

export function ProductCard({ product }: { product: Product }) {
  const lowStock = product.stock > 0 && product.stock <= 5;
  return (
    <article className="group flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md">
      <Link href={`/product/${product.id}`} className="relative block">
        <ProductImage icon={product.icon} className="transition group-hover:scale-[1.02]" iconClassName="size-2/5" />
        <FavoriteButton product={product} className="absolute top-2 right-2" />
      </Link>
      <Price price={product.price} oldPrice={product.oldPrice} />
      <Link
        href={`/product/${product.id}`}
        className="line-clamp-2 min-h-10 text-sm leading-5 text-zinc-800 hover:text-blue-600"
      >
        {product.brand && <span className="font-medium">{product.brand} / </span>}
        {product.title}
      </Link>
      <Rating rating={product.rating} reviewsCount={product.reviewsCount} />
      <p className={`text-xs ${lowStock ? 'text-amber-600' : 'text-zinc-400'}`}>
        {product.stock === 0 ? 'Нет в наличии' : lowStock ? `Осталось ${product.stock} шт.` : 'В наличии'}
      </p>
      <div className="mt-auto pt-1">
        <AddToCartButton product={product} />
      </div>
    </article>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm">
          <Skeleton className="aspect-square rounded-xl" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
