import type { Role } from '@/lib/api/types';

export const ROLE_LABELS: Record<Role, string> = {
  USER: 'Покупатель',
  ADMIN: 'Администратор',
  PICKER: 'Сборщик',
  COURIER: 'Курьер',
};

export const ROLE_COLORS: Record<Role, string> = {
  USER: 'bg-zinc-100 text-zinc-600',
  ADMIN: 'bg-violet-50 text-violet-700',
  PICKER: 'bg-amber-50 text-amber-700',
  COURIER: 'bg-sky-50 text-sky-700',
};
