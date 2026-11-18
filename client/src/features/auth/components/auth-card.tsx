import type { ReactNode } from 'react';

// Белая карточка формы входа / регистрации
export function AuthCard({ children }: { children: ReactNode }) {
  return <div className="rounded-3xl bg-white p-8 shadow-sm">{children}</div>;
}
