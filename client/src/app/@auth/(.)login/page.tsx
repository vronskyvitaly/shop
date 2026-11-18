import { Suspense } from 'react';
import { Modal } from '@/components/ui/modal';
import { AuthCard } from '@/features/auth/components/auth-card';
import { LoginForm } from '@/features/auth/components/auth-forms';

// Переход на /login по ссылке внутри сайта перехватывается: вход открывается модалкой поверх страницы
export default function LoginModal() {
  return (
    <Modal label="Вход">
      <AuthCard>
        <Suspense>
          <LoginForm inModal />
        </Suspense>
      </AuthCard>
    </Modal>
  );
}
