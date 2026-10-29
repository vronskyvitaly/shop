import type { Metadata } from 'next';
import { TemplatesAdmin } from '@/features/admin/components/templates-admin';

// Админка ничего не показывает, пока в браузере не подтверждена роль ADMIN (AdminShell), поэтому страница
// не попадает в статичную оболочку. Отключаем для неё dev-проверку «мгновенной навигации» Next
export const instant = false;

export const metadata: Metadata = { title: 'Шаблоны ответов' };

export default function AdminTemplatesPage() {
  return <TemplatesAdmin />;
}
