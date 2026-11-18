'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef } from 'react';

// Модалка для перехватывающих роутов (app/@auth/(.)login и т.п.): открыта, пока открыт её URL.
// Закрыть — router.back(): вернуться на страницу под модалкой. Нативный <dialog> сам держит фокус внутри
// и закрывается по Esc; клик по затемнению — тоже закрытие
export function Modal({ label, children }: { label: string; children: ReactNode }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);

  // С cacheComponents Next не удаляет прошлую страницу слота, а прячет её в <Activity> — эффекты при этом
  // очищаются. Закрываем <dialog> в очистке: иначе спрятанная модалка осталась бы модальной
  // и делала страницу под собой неактивной. Показали снова — эффект откроет её заново
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault(); // закрывает роутер, а не браузер — иначе URL останется /login
        router.back();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) router.back();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto bg-transparent p-0 backdrop:bg-zinc-900/50 backdrop:backdrop-blur-sm"
    >
      <div className="relative flex flex-col gap-4 rounded-3xl shadow-2xl shadow-zinc-900/25">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Закрыть"
          className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
        >
          <X className="size-5" />
        </button>
        {children}
      </div>
    </dialog>
  );
}
