'use client';

import { Eye, EyeOff } from 'lucide-react';
import { type ComponentProps, type ReactNode, useState } from 'react';
import { NativeSelect } from './native-select';

// Светлое поле: при наведении темнее рамка, в фокусе — белый фон и мягкое синее свечение
const control =
  'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-sm outline-none transition placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:ring-rose-500/10';

function Wrapper({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-700">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

type FieldProps = ComponentProps<'input'> & { label: string; error?: string };

// Поле формы с подписью и текстом ошибки. Совместимо с register() из react-hook-form
export function Field({ label, error, id, className = '', ...props }: FieldProps) {
  const inputId = id ?? props.name;
  return (
    <Wrapper label={label} error={error} htmlFor={inputId}>
      <input id={inputId} aria-invalid={Boolean(error)} className={`h-11 ${control} ${className}`} {...props} />
    </Wrapper>
  );
}

// Поле пароля с кнопкой «показать / скрыть»
export function PasswordField({ label, error, id, className = '', ...props }: Omit<FieldProps, 'type'>) {
  const inputId = id ?? props.name;
  const [visible, setVisible] = useState(false);
  return (
    <Wrapper label={label} error={error} htmlFor={inputId}>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          className={`h-11 pr-11 ${control} ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
          aria-pressed={visible}
          className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </Wrapper>
  );
}

type TextAreaProps = ComponentProps<'textarea'> & { label: string; error?: string };

export function TextArea({ label, error, id, className = '', ...props }: TextAreaProps) {
  const inputId = id ?? props.name;
  return (
    <Wrapper label={label} error={error} htmlFor={inputId}>
      <textarea
        id={inputId}
        aria-invalid={Boolean(error)}
        className={`min-h-24 py-2 ${control} ${className}`}
        {...props}
      />
    </Wrapper>
  );
}

type SelectProps = ComponentProps<'select'> & { label: string; error?: string };

export function Select({ label, error, id, className = '', children, ...props }: SelectProps) {
  const inputId = id ?? props.name;
  return (
    <Wrapper label={label} error={error} htmlFor={inputId}>
      <NativeSelect id={inputId} aria-invalid={Boolean(error)} className={className} {...props}>
        {children}
      </NativeSelect>
    </Wrapper>
  );
}
