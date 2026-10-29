// Серая «заглушка» на месте контента, пока он грузится. Размер и форму задают через className.
// motion-safe: пульсация только если пользователь не просил уменьшить анимацию в настройках ОС
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`rounded-md bg-zinc-200 motion-safe:animate-pulse ${className}`} />;
}
