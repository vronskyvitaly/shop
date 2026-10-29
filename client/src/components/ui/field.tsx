import type { ComponentProps, ReactNode } from 'react';
import { NativeSelect } from './native-select';

const control =
  'w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 aria-[invalid=true]:border-rose-500';

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
      <input id={inputId} aria-invalid={Boolean(error)} className={`h-10 ${control} ${className}`} {...props} />
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
