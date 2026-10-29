import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminSkeleton } from '@/features/admin/components/admin-shell';
import { ProductEditor } from '@/features/admin/components/products-admin';

// Админка ничего не показывает, пока в браузере не подтверждена роль ADMIN (AdminShell), поэтому
// страница с [id] не попадает в статичную оболочку. Отключаем для неё dev-проверку «мгновенной навигации»
export const instant = false;

export const metadata: Metadata = { title: 'Редактирование товара' };

export default function EditProductPage({ params }: PageProps<'/admin/products/[id]'>) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <EditProductRoute params={params} />
    </Suspense>
  );
}

async function EditProductRoute({ params }: Pick<PageProps<'/admin/products/[id]'>, 'params'>) {
  const { id } = await params;
  return <ProductEditor id={Number(id)} />;
}
