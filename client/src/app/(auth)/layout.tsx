import type { ReactNode } from 'react';

// Общая обёртка для /login и /register: карточка по центру
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-start justify-center py-10">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-sm">{children}</div>
    </div>
  );
}
