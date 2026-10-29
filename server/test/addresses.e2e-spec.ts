import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { MAX_ADDRESSES } from '../src/addresses/addresses.constants.js';
import { createTestApp, registerUser } from './utils.js';

const home = {
  label: 'Дом',
  recipientName: 'Иван Петров',
  phone: '+7 999 123-45-67',
  address: 'Москва, ул. Пушкина, д. 1',
};
const work = {
  label: 'Работа',
  recipientName: 'Иван Петров',
  phone: '89991234567',
  address: 'Москва, Тверская, 7',
};

describe('Адреса доставки (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('только для вошедших', async () => {
    await request(app.getHttpServer()).get('/addresses').expect(401);
  });

  it('первый адрес — основной; основной можно сменить, он всегда один и первый в списке', async () => {
    const { agent } = await registerUser(app);
    const { body: a } = await agent.post('/addresses').send(home).expect(201);
    const { body: b } = await agent
      .post('/addresses')
      .send({ ...work, label: '  ' })
      .expect(201);
    expect(a.isDefault).toBe(true);
    expect(b).toMatchObject({ isDefault: false, label: null });

    const { body: list } = await agent
      .post(`/addresses/${b.id}/default`)
      .expect(200);
    expect(
      list.map((x: { id: number; isDefault: boolean }) => [x.id, x.isDefault]),
    ).toEqual([
      [b.id, true],
      [a.id, false],
    ]);

    const { body: updated } = await agent
      .patch(`/addresses/${a.id}`)
      .send({ address: 'Москва, Арбат, 10' })
      .expect(200);
    expect(updated).toMatchObject({
      address: 'Москва, Арбат, 10',
      label: 'Дом',
    });
  });

  it('удалили основной — основным становится оставшийся', async () => {
    const { agent } = await registerUser(app);
    const { body: a } = await agent.post('/addresses').send(home).expect(201);
    const { body: b } = await agent.post('/addresses').send(work).expect(201);
    await agent.delete(`/addresses/${a.id}`).expect(204);
    const { body: list } = await agent.get('/addresses').expect(200);
    expect(list).toEqual([
      expect.objectContaining({ id: b.id, isDefault: true }),
    ]);
  });

  it('чужой адрес не виден и не меняется; валидация и лимит', async () => {
    const owner = await registerUser(app);
    const other = await registerUser(app);
    const { body: address } = await owner.agent
      .post('/addresses')
      .send(home)
      .expect(201);

    expect((await other.agent.get('/addresses').expect(200)).body).toEqual([]);
    await other.agent
      .patch(`/addresses/${address.id}`)
      .send({ label: 'Моё' })
      .expect(404);
    await other.agent.post(`/addresses/${address.id}/default`).expect(404);
    await other.agent.delete(`/addresses/${address.id}`).expect(404);

    await owner.agent
      .post('/addresses')
      .send({ ...home, phone: '123' })
      .expect(400);
    await owner.agent
      .post('/addresses')
      .send({ ...home, address: '' })
      .expect(400);
    await owner.agent
      .post('/addresses')
      .send({ ...home, userId: other.user.id })
      .expect(400); // лишние поля запрещены

    for (let i = 1; i < MAX_ADDRESSES; i++)
      await owner.agent.post('/addresses').send(work).expect(201);
    await owner.agent.post('/addresses').send(work).expect(400);
  });
});
