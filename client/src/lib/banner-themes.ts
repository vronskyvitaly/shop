// Цветовые темы баннера. Список совпадает с BANNER_COLORS на сервере (server/src/banners/banners.constants.ts).
// Классы записаны целиком: Tailwind находит только полные имена классов в исходниках
export const BANNER_THEMES = {
  blue: { label: 'Синий', gradient: 'from-blue-600 via-blue-500 to-sky-400' },
  violet: { label: 'Фиолетовый', gradient: 'from-violet-600 via-purple-600 to-fuchsia-500' },
  rose: { label: 'Розовый', gradient: 'from-rose-600 via-pink-500 to-orange-400' },
  orange: { label: 'Оранжевый', gradient: 'from-orange-500 via-amber-500 to-yellow-400' },
  emerald: { label: 'Зелёный', gradient: 'from-emerald-600 via-teal-500 to-cyan-400' },
  sky: { label: 'Голубой', gradient: 'from-sky-600 via-cyan-500 to-teal-400' },
  dark: { label: 'Тёмный', gradient: 'from-zinc-900 via-zinc-800 to-zinc-600' },
} as const;

export type BannerColor = keyof typeof BANNER_THEMES;
export const BANNER_COLORS = Object.keys(BANNER_THEMES) as [BannerColor, ...BannerColor[]];

export const bannerGradient = (color: string) =>
  BANNER_THEMES[color as BannerColor]?.gradient ?? BANNER_THEMES.blue.gradient;
