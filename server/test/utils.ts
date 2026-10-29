import type { INestApplication } from '@nestjs/common';
import type { Role } from '@prisma/client';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { ACCESS_COOKIE } from '../src/auth/auth.cookies.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { setupApp } from '../src/setup-app.js';

// Поднимает всё приложение (как main.ts, но без listen и Swagger)
export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>({
    logger: false,
  });
  setupApp(app);
  await app.init();
  return app;
}

let counter = 0;
// Уникальные значения: тесты пишут в одну базу и не должны пересекаться
export const unique = (prefix: string) =>
  `${prefix}-${Date.now()}-${counter++}`;
export const uniqueEmail = (prefix = 'user') => `${unique(prefix)}@test.io`;

export type Agent = ReturnType<typeof request.agent>;

/**
 * Регистрирует пользователя и возвращает supertest-агент, который, как браузер, хранит куки.
 * admin: true (или role) — сразу выдаёт роль и входит заново, чтобы роль попала в access-токен
 */
export async function registerUser(
  app: INestApplication<App>,
  { admin = false, role }: { admin?: boolean; role?: Role } = {},
) {
  const grant = admin ? 'ADMIN' : role;
  let agent = request.agent(app.getHttpServer());
  const email = uniqueEmail(grant?.toLowerCase() ?? 'user');
  const password = 'secret123';
  let res = await agent
    .post('/auth/register')
    .send({ email, name: 'Test', password })
    .expect(201);
  const user = res.body as { id: number; email: string };

  if (grant) {
    await app
      .get(PrismaService)
      .user.update({ where: { id: user.id }, data: { role: grant } });
    agent = request.agent(app.getHttpServer());
    res = await agent.post('/auth/login').send({ email, password }).expect(200);
  }
  return { agent, user, email, accessToken: getCookie(res, ACCESS_COOKIE)! };
}

// Достаёт значение куки из заголовков Set-Cookie ответа
export function getCookie(
  res: request.Response,
  name: string,
): string | undefined {
  const header = res.headers['set-cookie'] as unknown as string[] | undefined;
  const raw = header?.find((c) => c.startsWith(`${name}=`));
  return raw?.split(';')[0].slice(name.length + 1);
}

// Категория и товар для теста (через админский API, как это делает админка)
export async function createProduct(
  admin: Agent,
  overrides: Record<string, unknown> = {},
) {
  const category = await admin
    .post('/admin/categories')
    .send({ name: unique('Категория'), icon: 'package' })
    .expect(201);
  const product = await admin
    .post('/admin/products')
    .send({
      title: unique('Товар'),
      description: 'Описание',
      brand: 'Brand',
      price: 1000,
      oldPrice: 1500,
      stock: 5,
      icon: 'package',
      categoryId: category.body.id,
      ...overrides,
    })
    .expect(201);
  return product.body as {
    id: number;
    title: string;
    price: number;
    stock: number;
    categoryId: number;
  };
}

export const orderForm = {
  recipientName: 'Иван Петров',
  phone: '+7 999 123-45-67',
  address: 'Москва, ул. Пушкина, д. 1',
  deliveryMethod: 'COURIER',
  paymentMethod: 'CASH_ON_DELIVERY',
};
