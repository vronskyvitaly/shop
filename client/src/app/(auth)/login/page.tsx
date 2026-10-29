import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthCard } from '@/features/auth/components/auth-card';
import { LoginForm } from '@/features/auth/components/auth-forms';

export const metadata: Metadata = { title: 'Вход' };

// Suspense: форма читает ?next= через useSearchParams
export default function LoginPage() {
  return (
    <AuthCard>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
