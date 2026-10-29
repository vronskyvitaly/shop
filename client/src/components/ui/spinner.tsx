// Крутящийся индикатор загрузки. Цвет берёт от текста (currentColor), размер — через className.
// label — текст для скринридеров; без него спиннер декоративный (рядом уже есть текст)
export function Spinner({ className = 'size-4', label }: { className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`shrink-0 animate-spin ${className}`}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
