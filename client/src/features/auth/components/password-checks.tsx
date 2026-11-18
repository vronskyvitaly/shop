import { Check } from 'lucide-react';
import { PASSWORD_MAX, PASSWORD_MIN } from '@/lib/validation/auth.schemas';

// Подсказки под полями пароля: серый кружок → зелёный с галочкой, как только правило выполнено
export function PasswordChecks({ password, confirm }: { password: string; confirm: string }) {
  const checks = [
    {
      label: `От ${PASSWORD_MIN} до ${PASSWORD_MAX} символов`,
      ok: password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX,
    },
    { label: 'Пароли совпадают', ok: confirm.length > 0 && password === confirm },
  ];

  return (
    <ul className="-mt-1 flex flex-col gap-1.5" aria-label="Требования к паролю">
      {checks.map(({ label, ok }) => (
        <li
          key={label}
          className={`flex items-center gap-2 text-xs transition-colors ${ok ? 'text-emerald-700' : 'text-zinc-500'}`}
        >
          <span
            className={`flex size-4 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
              ok
                ? 'scale-100 border-emerald-500 bg-emerald-500 text-white'
                : 'border-zinc-300 bg-white text-transparent'
            }`}
            aria-hidden
          >
            <Check className="size-3" strokeWidth={3} />
          </span>
          {label}
          <span className="sr-only">{ok ? ' — выполнено' : ' — не выполнено'}</span>
        </li>
      ))}
    </ul>
  );
}
