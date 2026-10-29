import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/components/auth-forms';

export const metadata: Metadata = { title: 'Вход' };

// Suspense: форма читает ?next= через useSearchParams
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
