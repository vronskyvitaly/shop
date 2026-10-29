import { existsSync } from 'node:fs';

// Отдельная база для e2e: тесты её очищают, поэтому она не должна совпадать с рабочей
if (existsSync('.env')) process.loadEnvFile('.env');
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? '';
if (!TEST_DATABASE_URL) throw new Error('Не задан TEST_DATABASE_URL в server/.env (см. .env.example)');
if (TEST_DATABASE_URL === process.env.DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL совпадает с DATABASE_URL: e2e-тесты очистили бы рабочую базу');
}
