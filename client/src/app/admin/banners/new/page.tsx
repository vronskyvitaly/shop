import type { Metadata } from 'next';
import { BannerEditor } from '@/features/admin/components/banners-admin';

// Админка ничего не показывает, пока в браузере не подтверждена роль ADMIN (AdminShell), поэтому страница
// не попадает в статичную оболочку. Отключаем для неё dev-проверку «мгновенной навигации» Next
export const instant = false;

export const metadata: Metadata = { title: 'Новый баннер' };

export default function NewBannerPage() {
  return <BannerEditor />;
}
