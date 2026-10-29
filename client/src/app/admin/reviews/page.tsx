import type { Metadata } from 'next';
import { ReviewsAdmin } from '@/features/admin/components/reviews-admin';

// Админка ничего не показывает, пока в браузере не подтверждена роль ADMIN (AdminShell), поэтому страница
// не попадает в статичную оболочку. Отключаем для неё dev-проверку «мгновенной навигации» Next
export const instant = false;

export const metadata: Metadata = { title: 'Отзывы' };

export default function AdminReviewsPage() {
  return <ReviewsAdmin />;
}
