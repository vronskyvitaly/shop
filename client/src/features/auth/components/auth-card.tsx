import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

// Белая карточка формы входа / регистрации
export function AuthCard({ children }: { children: ReactNode }) {
  return <div className="rounded-3xl bg-white p-8 shadow-sm">{children}</div>;
}

// Под формой регистрации: магазин — демо, всё вымышленное
export function DemoNotice() {
  return (
    <aside className="flex gap-3 rounded-3xl border border-zinc-200 bg-zinc-50 p-5 text-sm leading-relaxed text-zinc-600">
      <Info className="mt-0.5 size-5 shrink-0 text-blue-600" aria-hidden />
      <div className="flex flex-col gap-2">
        <p className="font-semibold text-zinc-900">Это демо-версия Маркета</p>
        <p>
          Все товары, цены и акции вымышлены. Заказ можно оформить как пример — пройти путь от корзины до доставки, — но
          его никто не соберёт и не привезёт, а оплата только имитируется.
        </p>
        <p>
          Не указывайте настоящие данные карт и пароли от других сервисов. Разработчик не несёт ответственности за
          оформленные заказы и использование сайта.
        </p>
      </div>
    </aside>
  );
}
