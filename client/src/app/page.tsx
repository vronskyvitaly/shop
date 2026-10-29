import { Suspense } from 'react';
import { Catalog } from '@/features/catalog/components/catalog';
import { ProductGridSkeleton } from '@/features/catalog/components/product-card';

// Suspense обязателен: с cacheComponents Next пререндерит клиентские компоненты,
// а useSearchParams и запросы RTK Query доступны только во время запроса
export default function HomePage() {
  return (
    <Suspense fallback={<ProductGridSkeleton />}>
      <Catalog />
    </Suspense>
  );
}
