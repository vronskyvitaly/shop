import { useSyncExternalStore } from 'react';

// Минимальные всплывающие уведомления без библиотек: модульное хранилище + useSyncExternalStore
export interface Toast {
  id: number;
  title: string;
  description?: string;
  href?: string;
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function showToast(toast: Omit<Toast, 'id'>, durationMs = 5000) {
  const id = nextId++;
  toasts = [...toasts.slice(-3), { ...toast, id }]; // не больше 4 одновременно
  emit();
  setTimeout(() => dismissToast(id), durationMs);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const EMPTY: Toast[] = [];
export const useToasts = () =>
  useSyncExternalStore(
    subscribe,
    () => toasts,
    () => EMPTY,
  );
