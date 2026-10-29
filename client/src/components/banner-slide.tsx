import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Banner } from '@/lib/api/types';
import { bannerGradient } from '@/lib/banner-themes';
import { IconGlyph } from './product-icon';

type SlideContent = Pick<Banner, 'title' | 'subtitle' | 'buttonText' | 'link' | 'color' | 'icon'>;

// Один баннер: градиент, текст слева, иконка-заглушка справа (под S3 здесь появится фото).
// preview — в админке: без ссылки, чтобы клик по предпросмотру не уводил со страницы
export function BannerSlide({ banner, preview = false }: { banner: SlideContent; preview?: boolean }) {
  const content = (
    <div
      className={`relative flex h-52 items-center gap-6 overflow-hidden rounded-3xl bg-gradient-to-r px-6 text-white sm:h-60 sm:px-10 ${bannerGradient(banner.color)}`}
    >
      <div className="relative z-10 flex min-w-0 flex-1 flex-col items-start gap-2">
        <h2 className="line-clamp-2 text-2xl leading-tight font-black sm:text-4xl">
          {banner.title || 'Заголовок баннера'}
        </h2>
        {banner.subtitle && <p className="line-clamp-2 text-sm text-white/85 sm:text-base">{banner.subtitle}</p>}
        {banner.buttonText && (
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition group-hover:gap-2.5">
            {banner.buttonText} <ArrowRight className="size-4" />
          </span>
        )}
      </div>
      {/* Декоративная иконка: на узком экране уходит за текст полупрозрачной */}
      <div className="absolute -right-6 flex size-48 items-center justify-center rounded-full bg-white/15 opacity-60 sm:static sm:size-44 sm:shrink-0 sm:opacity-100">
        <IconGlyph name={banner.icon} className="size-24 sm:size-20" />
      </div>
    </div>
  );

  if (preview) return content;
  return (
    <Link
      href={banner.link}
      className="group block rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      {content}
    </Link>
  );
}
