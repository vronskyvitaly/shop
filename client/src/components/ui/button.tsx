import type { ComponentProps } from 'react';
import { Spinner } from './spinner';

type ButtonProps = ComponentProps<'button'> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
};

const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
  outline: 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50',
  ghost: 'text-zinc-600 hover:bg-zinc-100',
  danger: 'bg-rose-50 text-rose-700 hover:bg-rose-100',
};

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {/* Спиннер рядом с текстом, а не вместо него: кнопка не меняет ширину и понятно, что именно грузится */}
      {loading && <Spinner />}
      {children}
    </button>
  );
}
