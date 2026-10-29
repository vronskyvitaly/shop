import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import {
  createTestApp,
  getCookie,
  registerUser,
  uniqueEmail,
} from './utils.js';

describe('Auth и роли (e2e)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('регистрация: роль USER, httpOnly-куки с префиксом shop_, пароль не отдаётся', async () => {
    const res = await http()
      .post('/auth/register')
      .send({ email: uniqueEmail(), name: 'Аня', password: 'secret123' })
      .expect(201);
    expect(res.body).toMatchObject({ role: 'USER' });
    expect(res.body).not.toHaveProperty('password');
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.find((c) => c.startsWith('shop_access_token='))).toMatch(
      /HttpOnly/,
    );
    expect(cookies.find((c) => c.startsWith('shop_refresh_token='))).toMatch(
      /Path=\/auth/,
    );
  });

  it('роль нельзя передать при регистрации (forbidNonWhitelisted)', async () => {
    await http()
      .post('/auth/register')
      .send({
        email: uniqueEmail(),
        name: 'Хакер',
        password: 'secret123',
        role: 'ADMIN',
      })
      .expect(400);
  });

  it('админские маршруты: гость → 401, покупатель → 403, администратор → 200', async () => {
    await http().get('/admin/stats').expect(401);
    const { agent: user } = await registerUser(app);
    await user.get('/admin/stats').expect(403);
    await user
      .post('/admin/categories')
      .send({ name: 'X', icon: 'package' })
      .expect(403);
    const { agent: admin } = await registerUser(app, { admin: true });
    const stats = await admin.get('/admin/stats').expect(200);
    expect(stats.body).toHaveProperty('productsCount');
  });

  it('/auth/me возвращает роль; refresh сохраняет роль', async () => {
    const { agent: admin } = await registerUser(app, { admin: true });
    expect((await admin.get('/auth/me').expect(200)).body.role).toBe('ADMIN');
    const res = await admin.post('/auth/refresh').expect(200);
    expect(getCookie(res, 'shop_access_token')).toBeTruthy();
    await admin.get('/admin/stats').expect(200);
  });

  it('профиль: смена имени; лишние поля (email, role) запрещены', async () => {
    const { agent } = await registerUser(app);
    const res = await agent
      .patch('/auth/me')
      .send({ name: '  Новое имя ' })
      .expect(200);
    expect(res.body).toMatchObject({ name: 'Новое имя', role: 'USER' });
    await agent
      .patch('/auth/me')
      .send({ name: 'X', role: 'ADMIN' })
      .expect(400);
  });

  it('смена пароля: проверка текущего, старый пароль перестаёт работать, другие сессии закрываются', async () => {
    const { agent, email } = await registerUser(app);
    // Вторая сессия того же пользователя (другое устройство)
    const other = request.agent(app.getHttpServer());
    await other
      .post('/auth/login')
      .send({ email, password: 'secret123' })
      .expect(200);

    await agent
      .post('/auth/password')
      .send({ currentPassword: 'wrong', newPassword: 'newsecret123' })
      .expect(400);
    await agent
      .post('/auth/password')
      .send({ currentPassword: 'secret123', newPassword: 'newsecret123' })
      .expect(204);

    await http()
      .post('/auth/login')
      .send({ email, password: 'secret123' })
      .expect(401);
    await http()
      .post('/auth/login')
      .send({ email, password: 'newsecret123' })
      .expect(200);
    await agent.post('/auth/refresh').expect(200); // текущая сессия жива
    await other.post('/auth/refresh').expect(401); // другая закрыта
  });

  it('администратор меняет роль другого пользователя, но не свою; второго админа не назначить', async () => {
    const { agent: admin, user: me } = await registerUser(app, { admin: true });
    const { user: otherAdmin } = await registerUser(app, { admin: true });
    const { user } = await registerUser(app);
    const res = await admin
      .patch(`/admin/users/${user.id}/role`)
      .send({ role: 'COURIER' })
      .expect(200);
    expect(res.body.role).toBe('COURIER');
    await admin
      .patch(`/admin/users/${user.id}/role`)
      .send({ role: 'ADMIN' })
      .expect(400);
    await admin
      .patch(`/admin/users/${otherAdmin.id}/role`)
      .send({ role: 'USER' })
      .expect(400);
    await admin
      .patch(`/admin/users/${me.id}/role`)
      .send({ role: 'USER' })
      .expect(400);
  });
});
