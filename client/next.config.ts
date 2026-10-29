import type { NextConfig } from 'next';

// Куда Next проксирует /api/* — NestJS-сервер магазина. Браузер ходит только на адрес Next, поэтому
// наружу (туннель, ngrok, cloudflared) достаточно открыть один порт 3003, а куки и CORS работают как локально.
// Адрес — из .env (не в git, пример — .env.example)
const API_PROXY_TARGET = process.env.API_PROXY_TARGET;
if (!API_PROXY_TARGET) throw new Error('Не задан API_PROXY_TARGET в client/.env (см. .env.example)');

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_PROXY_TARGET}/:path*` }];
  },
  // Dev-сервер Next принимает запросы только с localhost. Разрешаем адреса туннелей, через которые показываем сайт
  allowedDevOrigins: ['*.devtunnels.ms', '*.trycloudflare.com', '*.ngrok-free.app', '*.ngrok.app'],
};

export default nextConfig;
