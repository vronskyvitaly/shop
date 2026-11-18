import { Suspense } from 'react';
import { Modal } from '@/components/ui/modal';
import { AuthCard } from '@/features/auth/components/auth-card';
import { RegisterForm } from '@/features/auth/components/auth-forms';

// Переход на /register по ссылке внутри сайта перехватывается: регистрация открывается модалкой поверх страницы
export default function RegisterModal() {
  return (
    <Modal label="Регистрация">
      <AuthCard>
        <Suspense>
          <RegisterForm inModal />
        </Suspense>
      </AuthCard>
    </Modal>
  );
}
