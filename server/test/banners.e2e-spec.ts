import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp, registerUser, unique, type Agent } from './utils.js';

const DAY = 24 * 60 * 60 * 1000;
const banner = (overrides: Record<string, unknown> = {}) => ({
  title: unique('Баннер'),
  link: '/?categoryId=1',
  color: 'blue',
  icon: 'gift',
  ...overrides,
});

describe('Баннеры (e2e)', () => {
  let app: INestApplication<App>;
  let admin: Agent;
  const http = () => request(app.getHttpServer());
  const visibleIds = async () => ((await http().get('/banners').expect(200)).body as { id: number }[]).map((b) => b.id);

  beforeAll(async () => {
    app = await createTestApp();
    ({ agent: admin } = await registerUser(app, { admin: true }));
  });

  afterAll(async () => {
    await app.close();
  });

  it('CRUD только для админа, новый баннер — в конце карусели', async () => {
    const { agent } = await registerUser(app);
    await agent.post('/admin/banners').send(banner()).expect(403);

    const { body: first } = await admin.post('/admin/banners').send(banner({ subtitle: '  ' })).expect(201);
    const { body: second } = await admin.post('/admin/banners').send(banner()).expect(201);
    expect(first.subtitle).toBeNull(); // пустая строка → null
    expect(second.position).toBe(first.position + 1);

    const { body: updated } = await admin.patch(`/admin/banners/${first.id}`).send({ title: 'Новый заголовок' }).expect(200);
    expect(updated).toMatchObject({ title: 'Новый заголовок', color: 'blue' });

    await admin.delete(`/admin/banners/${first.id}`).expect(204);
    await admin.delete(`/admin/banners/${first.id}`).expect(404);
    await admin.get(`/admin/banners/${first.id}`).expect(404);
  });

  it('ссылка — только путь внутри магазина', async () => {
    for (const link of ['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', '/a b']) {
      await admin.post('/admin/banners').send(banner({ link })).expect(400);
    }
    await admin.post('/admin/banners').send(banner({ link: '/product/12' })).expect(201);
    await admin.post('/admin/banners').send(banner({ color: 'pink' })).expect(400);
  });

  it('витрина: только включённые и в периоде показа', async () => {
    const now = Date.now();
    const iso = (offset: number) => new Date(now + offset).toISOString();
    const create = async (overrides: Record<string, unknown>) =>
      ((await admin.post('/admin/banners').send(banner(overrides)).expect(201)).body as { id: number }).id;

    const always = await create({});
    const hidden = await create({ isActive: false });
    const current = await create({ startsAt: iso(-DAY), endsAt: iso(DAY) });
    const future = await create({ startsAt: iso(DAY) });
    const past = await create({ endsAt: iso(-DAY) });

    const ids = await visibleIds();
    expect(ids).toEqual(expect.arrayContaining([always, current]));
    for (const id of [hidden, future, past]) expect(ids).not.toContain(id);

    // Окончание раньше начала — ошибка, в том числе если вторая дата уже сохранена
    await admin.post('/admin/banners').send(banner({ startsAt: iso(DAY), endsAt: iso(-DAY) })).expect(400);
    await admin.patch(`/admin/banners/${future}`).send({ endsAt: iso(0) }).expect(400);
    // null снимает ограничение — баннер появляется
    await admin.patch(`/admin/banners/${future}`).send({ startsAt: null }).expect(200);
    expect(await visibleIds()).toContain(future);
  });

  it('порядок задаётся списком id', async () => {
    const a = (await admin.post('/admin/banners').send(banner()).expect(201)).body.id as number;
    const b = (await admin.post('/admin/banners').send(banner()).expect(201)).body.id as number;
    await admin.put('/admin/banners/order').send({ ids: [b, a] }).expect(200);
    const ids = await visibleIds();
    expect(ids.indexOf(b)).toBeLessThan(ids.indexOf(a));
  });
});
