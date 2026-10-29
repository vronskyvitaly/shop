import type { ReactNode } from 'react';

// Общая обёртка для /login и /register: колонка по центру (карточка формы — AuthCard на странице)
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-start justify-center py-10">
      <div className="flex w-full max-w-sm flex-col gap-4">{children}</div>
    </div>
  );
}
