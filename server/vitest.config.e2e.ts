import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { TEST_DATABASE_URL } from './test/test-database-url.js';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Отдельная база для e2e (TEST_DATABASE_URL из .env): тесты не трогают рабочую.
    // Переменные окружения важнее .env, поэтому ConfigModule и Prisma возьмут именно её
    // PUBLIC_API_PREFIX '': тесты ходят на сервер напрямую, без прокси Next (/api)
    env: { DATABASE_URL: TEST_DATABASE_URL, NODE_ENV: 'test', PUBLIC_API_PREFIX: '' },
    globalSetup: './test/global-setup.ts', // очищает тестовую базу и применяет миграции
    // Все файлы пишут в одну базу и проверяют общие данные (счётчики, остатки) — по очереди надёжнее
    fileParallelism: false,
  },
});
