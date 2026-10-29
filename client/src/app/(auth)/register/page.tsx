import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthCard, DemoNotice } from '@/features/auth/components/auth-card';
import { RegisterForm } from '@/features/auth/components/auth-forms';

export const metadata: Metadata = { title: 'Регистрация' };

export default function RegisterPage() {
  return (
    <>
      <AuthCard>
        <Suspense>
          <RegisterForm />
        </Suspense>
      </AuthCard>
      <DemoNotice />
    </>
  );
}
