'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

// Страницы 1 … 4 5 [6] 7 8 … 20
function pagesToShow(page: number, pages: number): (number | '…')[] {
  const around = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...around].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? (['…', p] as const) : [p]));
}

export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  if (pages <= 1) return null;
  const button = 'flex size-10 items-center justify-center rounded-xl text-sm transition';
  return (
    <nav aria-label="Страницы" className="flex items-center justify-center gap-1">
      <button
        type="button"
        className={`${button} hover:bg-white disabled:opacity-30`}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Предыдущая"
      >
        <ChevronLeft className="size-4" />
      </button>
      {pagesToShow(page, pages).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-zinc-400">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
            className={`${button} ${p === page ? 'bg-blue-600 font-semibold text-white' : 'hover:bg-white'}`}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className={`${button} hover:bg-white disabled:opacity-30`}
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        aria-label="Следующая"
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}
