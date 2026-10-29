import type { ComponentProps, ReactNode } from 'react';

// Белая карточка-секция на сером фоне страницы
export function Card({ className = '', ...props }: ComponentProps<'section'>) {
  return <section className={`rounded-2xl bg-white p-5 shadow-sm ${className}`} {...props} />;
}

// Заглушка для пустых списков: «Корзина пуста», «Заказов пока нет»
export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-16 text-center shadow-sm">
      <div className="text-zinc-300">{icon}</div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

export function Badge({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
