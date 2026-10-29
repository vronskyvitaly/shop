import type { Metadata } from 'next';
import { UsersAdmin } from '@/features/admin/components/users-admin';

// Админка ничего не показывает, пока в браузере не подтверждена роль ADMIN (AdminShell), поэтому страница
// не попадает в статичную оболочку. Отключаем для неё dev-проверку «мгновенной навигации» Next
export const instant = false;

export const metadata: Metadata = { title: 'Пользователи' };

export default function AdminUsersPage() {
  return <UsersAdmin />;
}
