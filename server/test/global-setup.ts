import { execSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './test-database-url.js';

// Выполняется один раз перед всеми e2e-тестами: очищает тестовую базу (TEST_DATABASE_URL)
// и применяет к ней все миграции. Рабочая база из DATABASE_URL не затрагивается.
export default function setup() {
  // Явно, а не из test.env: globalSetup выполняется до того, как vitest выставит env для тестов
  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
  execSync('npx prisma db execute --stdin --schema prisma/schema.prisma', {
    input: 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;',
    stdio: ['pipe', 'ignore', 'inherit'],
    env,
  });
  execSync('npx prisma migrate deploy', { stdio: ['ignore', 'ignore', 'inherit'], env });
}
