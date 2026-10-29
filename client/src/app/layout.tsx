import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Suspense } from 'react';
import { Header, HeaderFallback } from '@/components/layout/header';
import { Toaster } from '@/components/toaster';
import { RealtimeSync } from '@/features/realtime/realtime-sync';
import { Providers } from './providers';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin', 'cyrillic'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'Маркет — интернет-магазин', template: '%s — Маркет' },
  description: 'Интернет-магазин на NestJS и Next.js',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      {/* suppressHydrationWarning: расширения браузера дописывают атрибуты в <body> до гидратации */}
      <body suppressHydrationWarning className="flex min-h-full flex-col">
        <Providers>
          {/* Suspense: с cacheComponents клиентские компоненты с RTK Query и useSearchParams
              рендерятся только в браузере, а на сервере — статичная заглушка */}
          <Suspense fallback={<HeaderFallback />}>
            <Header />
            <RealtimeSync />
          </Suspense>
          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6">{children}</main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
