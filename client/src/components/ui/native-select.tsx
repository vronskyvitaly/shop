import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';

// Нативный <select> (доступность и мобильные пикеры — бесплатно), но со своей стрелкой:
// appearance-none убирает браузерную, которая прижата к самому краю и выглядит по-разному в каждом браузере
export function NativeSelect({ className = '', ...props }: ComponentProps<'select'>) {
  return (
    <div className={`relative ${className}`}>
      <select
        className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-zinc-300 bg-white pr-10 pl-3 text-sm transition outline-none hover:border-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 aria-[invalid=true]:border-rose-500"
        {...props}
      />
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-zinc-500"
      />
    </div>
  );
}
