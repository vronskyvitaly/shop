'use client';

import { useEffect, useState } from 'react';
import { BannerSlide } from '@/components/banner-slide';
import { Skeleton } from '@/components/ui/skeleton';
import type { Banner } from '@/lib/api/types';
import { useGetBannersQuery } from '../api';

const AUTOPLAY_MS = 5000;

// Карусель баннеров на главной. Нет активных баннеров — блока нет совсем
export function BannerCarousel() {
  const { data: banners, isLoading } = useGetBannersQuery();
  if (isLoading) return <Skeleton className="h-52 rounded-3xl sm:h-60" />;
  if (!banners?.length) return null;
  return <Carousel banners={banners} />;
}

function Carousel({ banners }: { banners: Banner[] }) {
  const count = banners.length;
  const [index, setIndex] = useState(0);
  // Пауза, пока курсор или фокус клавиатуры на карусели: не листаем баннер из-под руки
  const [paused, setPaused] = useState(false);
  // Админ мог удалить баннеры, пока карусель открыта: индекс не должен выйти за пределы
  const current = index % count;

  useEffect(() => {
    if (paused || count < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused, count]);

  return (
    <section
      aria-roledescription="карусель"
      aria-label="Акции"
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="overflow-hidden rounded-3xl">
        <div
          className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {banners.map((banner, i) => (
            <div
              key={banner.id}
              role="group"
              aria-roledescription="слайд"
              aria-label={`${i + 1} из ${count}`}
              // Скрытые слайды не должны получать фокус по Tab
              inert={i !== current}
              className="w-full shrink-0"
            >
              <BannerSlide banner={banner} />
            </div>
          ))}
        </div>
      </div>

      {count > 1 && (
        // Только точки: стрелки поверх баннера перекрывали текст.
        // На телефоне баннер узкий и точки легли бы на кнопку — там они под баннером (серые), с sm — внутри (белые)
        <div className="mt-3 flex items-center justify-center gap-2.5 sm:absolute sm:bottom-4 sm:left-1/2 sm:mt-0 sm:-translate-x-1/2">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              aria-label={`Баннер ${i + 1}`}
              aria-current={i === current}
              onClick={() => setIndex(i)}
              className={`h-3 rounded-full transition-all sm:shadow-sm ${
                i === current
                  ? 'w-10 bg-blue-600 sm:bg-white'
                  : 'w-3 bg-zinc-300 hover:bg-zinc-400 sm:bg-white/60 sm:hover:bg-white/90'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
