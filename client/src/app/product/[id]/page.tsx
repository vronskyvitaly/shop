import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductSkeleton, ProductView } from '@/features/catalog/components/product-view';

export const metadata: Metadata = { title: 'Товар' };

// С cacheComponents params читаем внутри Suspense: так Next отдаёт статичную оболочку сразу,
// а сама страница товара (данные из RTK Query) рендерится в браузере
export default function ProductPage({ params }: PageProps<'/product/[id]'>) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductRoute params={params} />
    </Suspense>
  );
}

async function ProductRoute({ params }: Pick<PageProps<'/product/[id]'>, 'params'>) {
  const { id } = await params;
  return <ProductView id={Number(id)} />;
}
