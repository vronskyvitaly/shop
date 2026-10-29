import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminShell, AdminSkeleton } from '@/features/admin/components/admin-shell';

export const metadata: Metadata = { title: { default: 'Админ-панель', template: '%s — Админ-панель' } };
export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
