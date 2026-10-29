'use client';

import { Bell, X } from 'lucide-react';
import Link from 'next/link';
import { dismissToast, useToasts } from '@/lib/toast';

export function Toaster() {
  const toasts = useToasts();
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 rounded-2xl bg-zinc-900 p-4 text-sm text-white shadow-lg"
        >
          <Bell className="mt-0.5 size-4 shrink-0 text-blue-300" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{toast.title}</p>
            {toast.description && <p className="text-zinc-300">{toast.description}</p>}
            {toast.href && (
              <Link
                href={toast.href}
                onClick={() => dismissToast(toast.id)}
                className="mt-1 inline-block text-blue-300 underline"
              >
                Открыть
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Закрыть"
            className="text-zinc-400 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
