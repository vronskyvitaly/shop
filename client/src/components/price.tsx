import { Star } from 'lucide-react';
import { discountPercent, formatPrice, plural } from '@/lib/format';

// Цена как на маркетплейсе: текущая крупно, сразу за ней бейдж скидки, старая зачёркнута.
// Порядок важен: в узкой карточке на перенос уходит только старая цена, а скидка остаётся рядом с ценой.
// В карточке (md) на телефоне цена мельче — помещается даже 9 999 990 ₽ со скидкой
export function Price({
  price,
  oldPrice,
  size = 'md',
}: {
  price: number;
  oldPrice?: number | null;
  size?: 'md' | 'lg';
}) {
  const discount = discountPercent(price, oldPrice);
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      <span
        className={`font-bold whitespace-nowrap ${size === 'lg' ? 'text-3xl' : 'text-base sm:text-lg'} ${discount ? 'text-rose-600' : 'text-zinc-900'}`}
      >
        {formatPrice(price)}
      </span>
      {discount && (
        <>
          <span
            className={`rounded-md bg-rose-600 py-0.5 leading-none font-semibold whitespace-nowrap text-white ${size === 'lg' ? 'px-1.5 text-sm' : 'px-1 text-[11px]'}`}
          >
            −{discount}%
          </span>
          <span
            className={`whitespace-nowrap text-zinc-400 line-through ${size === 'lg' ? 'text-base' : 'text-xs sm:text-sm'}`}
          >
            {formatPrice(oldPrice!)}
          </span>
        </>
      )}
    </div>
  );
}

export function Rating({ rating, reviewsCount }: { rating: number; reviewsCount: number }) {
  if (reviewsCount === 0) return <span className="text-xs text-zinc-400">Нет отзывов</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-zinc-600">
      <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
      <span className="font-medium">{rating.toFixed(1)}</span>
      <span className="text-zinc-400">
        · {reviewsCount} {plural(reviewsCount, ['отзыв', 'отзыва', 'отзывов'])}
      </span>
    </span>
  );
}

// Выбор оценки звёздами (в форме отзыва) или просто отображение
export function Stars({
  value,
  onChange,
  size = 'size-5',
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: string;
}) {
  return (
    <div
      className="flex gap-0.5"
      role={onChange ? 'radiogroup' : undefined}
      aria-label={onChange ? 'Оценка' : `Оценка ${value} из 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const star = (
          <Star className={`${size} ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-zinc-300'}`} aria-hidden />
        );
        return onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} из 5`}
            onClick={() => onChange(n)}
          >
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </div>
  );
}
