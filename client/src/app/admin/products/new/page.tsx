import type { Metadata } from 'next';
import { ProductEditor } from '@/features/admin/components/products-admin';

// Админка ничего не показывает, пока в браузере не подтверждена роль ADMIN (AdminShell), поэтому страница
// не попадает в статичную оболочку. Отключаем для неё dev-проверку «мгновенной навигации» Next
export const instant = false;

export const metadata: Metadata = { title: 'Новый товар' };

export default function NewProductPage() {
  return <ProductEditor />;
}
