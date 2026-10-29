import type { Metadata } from 'next';
import { CategoriesAdmin } from '@/features/admin/components/categories-admin';

// Админка ничего не показывает, пока в браузере не подтверждена роль ADMIN (AdminShell), поэтому страница
// не попадает в статичную оболочку. Отключаем для неё dev-проверку «мгновенной навигации» Next
export const instant = false;

export const metadata: Metadata = { title: 'Категории' };

export default function AdminCategoriesPage() {
  return <CategoriesAdmin />;
}
