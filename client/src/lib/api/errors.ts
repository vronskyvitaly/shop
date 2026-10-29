import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

// Достаёт понятный текст ошибки из ответа Nest: { message: string | string[] }
export function getErrorMessage(error: FetchBaseQueryError | SerializedError | undefined): string {
  if (error && 'status' in error) {
    if (error.status === 'FETCH_ERROR') return 'Сервер недоступен';
    const message = (error.data as { message?: string | string[] } | undefined)?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (message) return message;
  }
  return 'Что-то пошло не так';
}
