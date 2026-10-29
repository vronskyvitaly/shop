import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminSkeleton } from '@/features/admin/components/admin-shell';
import { BannerEditor } from '@/features/admin/components/banners-admin';

// Админка ничего не показывает, пока в браузере не подтверждена роль ADMIN (AdminShell), поэтому
// страница с [id] не попадает в статичную оболочку. Отключаем для неё dev-проверку «мгновенной навигации»
export const instant = false;

export const metadata: Metadata = { title: 'Редактирование баннера' };

export default function EditBannerPage({ params }: PageProps<'/admin/banners/[id]'>) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <EditBannerRoute params={params} />
    </Suspense>
  );
}

async function EditBannerRoute({ params }: Pick<PageProps<'/admin/banners/[id]'>, 'params'>) {
  const { id } = await params;
  return <BannerEditor id={Number(id)} />;
}
