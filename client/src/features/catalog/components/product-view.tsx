'use client';

import { ChevronRight, MessageSquare, ShieldCheck, Truck } from 'lucide-react';
import Link from 'next/link';
import { Price, Rating, Stars } from '@/components/price';
import { ProductImage } from '@/components/product-icon';
import { Card } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetMeQuery } from '@/features/auth/api';
import { AddToCartButton, FavoriteButton, GoToCartLink } from '@/features/cart/components/cart-controls';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format';
import { FREE_DELIVERY_FROM } from '@/lib/order-status';
import { MyReview } from '@/features/reviews/components/my-review';
import { useGetProductQuery, useGetReviewEligibilityQuery, useGetReviewsQuery } from '../api';

export function ProductView({ id }: { id: number }) {
  const { data: product, isError, error } = useGetProductQuery(id);

  if (isError) {
    return (
      <Card className="text-center">
        <FormError message={getErrorMessage(error)} />
        <Link href="/" className="mt-4 inline-block text-blue-600 underline">
          Вернуться в каталог
        </Link>
      </Card>
    );
  }
  if (!product) return <ProductSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Хлебные крошки" className="flex items-center gap-1 text-sm text-zinc-500">
        <Link href="/" className="hover:text-blue-600">
          Главная
        </Link>
        <ChevronRight className="size-4" />
        <Link href={`/?categoryId=${product.category.id}`} className="hover:text-blue-600">
          {product.category.name}
        </Link>
      </nav>

      <Card className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
        <div className="relative">
          <ProductImage icon={product.icon} iconClassName="size-1/3" />
          <FavoriteButton product={product} className="absolute top-3 right-3" />
        </div>

        <div className="flex flex-col gap-3">
          {product.brand && <p className="text-sm font-medium text-blue-600">{product.brand}</p>}
          <h1 className="text-2xl font-bold">{product.title}</h1>
          <a href="#reviews">
            <Rating rating={product.rating} reviewsCount={product.reviewsCount} />
          </a>
          <h2 className="mt-2 font-semibold">О товаре</h2>
          <p className="text-sm leading-6 whitespace-pre-line text-zinc-700">{product.description}</p>
        </div>

        <aside className="flex flex-col gap-4 self-start rounded-2xl p-5 ring-1 ring-zinc-200">
          <Price price={product.price} oldPrice={product.oldPrice} size="lg" />
          <p className={`text-sm ${product.stock > 0 && product.stock <= 5 ? 'text-amber-600' : 'text-zinc-500'}`}>
            {product.stock === 0 ? 'Нет в наличии' : `В наличии: ${product.stock} шт.`}
          </p>
          <AddToCartButton product={product} size="lg" />
          <GoToCartLink productId={product.id} />
          <ul className="flex flex-col gap-2 text-sm text-zinc-600">
            <li className="flex gap-2">
              <Truck className="size-5 shrink-0 text-blue-600" />
              Курьером — бесплатно от {FREE_DELIVERY_FROM.toLocaleString('ru-RU')} ₽, в пункт выдачи — бесплатно
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="size-5 shrink-0 text-blue-600" />
              Гарантия производителя
            </li>
          </ul>
        </aside>
      </Card>

      <Reviews productId={product.id} count={product.reviewsCount} />
    </div>
  );
}

function Reviews({ productId, count }: { productId: number; count: number }) {
  const { data: me } = useGetMeQuery();
  const { data: reviews } = useGetReviewsQuery(productId);
  const { data: eligibility } = useGetReviewEligibilityQuery(productId, { skip: !me });

  return (
    <Card id="reviews" className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">
        Отзывы <span className="text-zinc-400">{count}</span>
      </h2>

      {/* Свой отзыв — со статусом модерации; новый можно написать только после получения товара */}
      {eligibility?.review ? (
        <MyReview productId={productId} review={eligibility.review} />
      ) : (
        eligibility?.canReview && <MyReview productId={productId} review={null} defaultOpen />
      )}
      {me && eligibility && !eligibility.purchased && !eligibility.review && (
        <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
          Оставить отзыв можно после получения товара
        </p>
      )}

      {reviews?.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <MessageSquare className="size-4" /> Отзывов пока нет
        </p>
      )}
      <ul className="flex flex-col divide-y divide-zinc-100">
        {reviews?.map((review) => (
          <li key={review.id} className="flex flex-col gap-1 py-4">
            <div className="flex items-center gap-3">
              <span className="font-medium">{review.user.name ?? 'Покупатель'}</span>
              <span className="text-xs text-zinc-400">
                {formatDate(review.createdAt)}
                {review.edited && ' · изменён'}
              </span>
            </div>
            <Stars value={review.rating} size="size-4" />
            <p className="text-sm whitespace-pre-line text-zinc-700">{review.text}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function ProductSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
      <Skeleton className="aspect-square rounded-xl" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
