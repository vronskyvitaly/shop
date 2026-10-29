import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createProduct, createTestApp, orderForm, registerUser, unique, type Agent } from './utils.js';

// Полный путь покупки: корзина → заказ → статусы → отзыв
describe('Корзина, заказы, отзывы (e2e)', () => {
  let app: INestApplication<App>;
  let admin: Agent;

  beforeAll(async () => {
    app = await createTestApp();
    ({ agent: admin } = await registerUser(app, { admin: true }));
  });

  afterAll(async () => {
    await app.close();
  });

  it('корзина: добавление, суммы со скидкой, лимит по остатку', async () => {
    const product = await createProduct(admin, { price: 1000, oldPrice: 1500, stock: 3 });
    const { agent } = await registerUser(app);
    await agent.post('/cart/items').send({ productId: product.id, quantity: 2 }).expect(201);
    const cart = await agent.post('/cart/items').send({ productId: product.id }).expect(201);
    expect(cart.body).toMatchObject({ count: 3, itemsTotal: 3000, oldItemsTotal: 4500, hasUnavailable: false });
    // Четвёртой штуки на складе нет
    await agent.post('/cart/items').send({ productId: product.id }).expect(400);
    await agent.patch(`/cart/items/${product.id}`).send({ quantity: 1 }).expect(200);
    expect((await agent.get('/cart').expect(200)).body.count).toBe(1);
  });

  it('избранное: добавление идемпотентно, удаление', async () => {
    const product = await createProduct(admin);
    const { agent } = await registerUser(app);
    await agent.put(`/favorites/${product.id}`).expect(204);
    await agent.put(`/favorites/${product.id}`).expect(204);
    expect((await agent.get('/favorites').expect(200)).body).toHaveLength(1);
    await agent.delete(`/favorites/${product.id}`).expect(204);
    expect((await agent.get('/favorites').expect(200)).body).toHaveLength(0);
  });

  it('заказ: списывает остаток, очищает корзину, считает доставку', async () => {
    const product = await createProduct(admin, { price: 500, oldPrice: null, stock: 5 });
    const { agent } = await registerUser(app);
    await agent.post('/orders').send(orderForm).expect(400); // корзина пуста
    await agent.post('/cart/items').send({ productId: product.id, quantity: 2 }).expect(201);

    const order = await agent.post('/orders').send(orderForm).expect(201);
    // 1000 ₽ < 1500 ₽ — курьер платный
    expect(order.body).toMatchObject({ status: 'PENDING', itemsTotal: 1000, deliveryPrice: 199, total: 1199, isPaid: false });
    expect(order.body.items[0]).toMatchObject({ productId: product.id, price: 500, quantity: 2 });
    expect((await agent.get('/cart').expect(200)).body.count).toBe(0);
    expect((await admin.get(`/admin/products/${product.id}`).expect(200)).body.stock).toBe(3);
  });

  it('нельзя заказать больше, чем осталось: ничего не меняется', async () => {
    const product = await createProduct(admin, { stock: 2 });
    const a = await registerUser(app);
    const b = await registerUser(app);
    await a.agent.post('/cart/items').send({ productId: product.id, quantity: 2 }).expect(201);
    await b.agent.post('/cart/items').send({ productId: product.id, quantity: 2 }).expect(201);
    await a.agent.post('/orders').send(orderForm).expect(201);
    // b положил товар в корзину раньше, но его уже раскупили
    await b.agent.post('/orders').send(orderForm).expect(409);
    expect((await b.agent.get('/cart').expect(200)).body).toMatchObject({ count: 2, hasUnavailable: true });
  });

  it('покупатель видит только свои заказы и может отменить новый — остаток возвращается', async () => {
    const product = await createProduct(admin, { stock: 4 });
    const { agent } = await registerUser(app);
    const other = await registerUser(app);
    await agent.post('/cart/items').send({ productId: product.id, quantity: 3 }).expect(201);
    const { body: order } = await agent.post('/orders').send(orderForm).expect(201);

    await other.agent.get(`/orders/${order.id}`).expect(404);
    expect((await agent.get('/orders').expect(200)).body.total).toBe(1);

    const cancelled = await agent.post(`/orders/${order.id}/cancel`).expect(201);
    expect(cancelled.body.status).toBe('CANCELLED');
    expect(cancelled.body.history.map((h: { status: string }) => h.status)).toEqual(['PENDING', 'CANCELLED']);
    expect((await admin.get(`/admin/products/${product.id}`).expect(200)).body.stock).toBe(4);
    await agent.post(`/orders/${order.id}/cancel`).expect(409);
  });

  it('покупатель отменяет заказ только в первые 15 минут после оформления', async () => {
    const product = await createProduct(admin, { stock: 2 });
    const { agent } = await registerUser(app);
    await agent.post('/cart/items').send({ productId: product.id }).expect(201);
    const { body: order } = await agent.post('/orders').send(orderForm).expect(201);

    // «Перематываем время»: заказ оформлен 16 минут назад
    const createdAt = new Date(Date.now() - 16 * 60 * 1000);
    await app.get(PrismaService).order.update({ where: { id: order.id }, data: { createdAt } });

    const res = await agent.post(`/orders/${order.id}/cancel`).expect(409);
    expect(res.body.message).toContain('15 минут');
    expect((await agent.get(`/orders/${order.id}`).expect(200)).body.status).toBe('PENDING');
    // Админ по-прежнему может отменить — с причиной
    await admin.patch(`/admin/orders/${order.id}/status`).send({ status: 'CANCELLED', comment: 'По просьбе покупателя' }).expect(200);
  });

  it('статусы: только вперёд по цепочке; после получения — оплачен и можно оставить отзыв', async () => {
    const product = await createProduct(admin);
    const { agent } = await registerUser(app);
    await agent.post('/cart/items').send({ productId: product.id }).expect(201);
    const { body: order } = await agent.post('/orders').send(orderForm).expect(201);

    // Отзыв до получения запрещён
    await agent.post(`/products/${product.id}/reviews`).send({ rating: 5, text: 'Отлично' }).expect(403);
    // Перескочить через статусы нельзя
    await admin.patch(`/admin/orders/${order.id}/status`).send({ status: 'DELIVERED' }).expect(400);

    for (const status of ['CONFIRMED', 'ASSEMBLING', 'SHIPPED', 'DELIVERED']) {
      await admin.patch(`/admin/orders/${order.id}/status`).send({ status }).expect(200);
    }
    const delivered = await agent.get(`/orders/${order.id}`).expect(200);
    expect(delivered.body).toMatchObject({ status: 'DELIVERED', isPaid: true });
    await agent.post(`/orders/${order.id}/cancel`).expect(409);

    expect((await agent.get(`/products/${product.id}/reviews/eligibility`).expect(200)).body.canReview).toBe(true);
    await agent.post(`/products/${product.id}/reviews`).send({ rating: 4, text: 'Хороший товар' }).expect(201);
    await agent.post(`/products/${product.id}/reviews`).send({ rating: 5, text: 'Ещё раз' }).expect(409);
    // Отзыв ушёл на модерацию — рейтинг товара не изменился (подробно — reviews.e2e-spec.ts)
    const updated = await agent.get(`/products/${product.id}`).expect(200);
    expect(updated.body).toMatchObject({ reviewsCount: 0 });
  });

  it('админ отменяет заказ только с причиной — покупатель видит её в истории', async () => {
    const product = await createProduct(admin, { stock: 3 });
    const { agent } = await registerUser(app);
    await agent.post('/cart/items').send({ productId: product.id }).expect(201);
    const { body: order } = await agent.post('/orders').send(orderForm).expect(201);

    await admin.patch(`/admin/orders/${order.id}/status`).send({ status: 'CANCELLED' }).expect(400);
    await admin.patch(`/admin/orders/${order.id}/status`).send({ status: 'CANCELLED', comment: '   ' }).expect(400);
    await admin.patch(`/admin/orders/${order.id}/status`).send({ status: 'CANCELLED', comment: 'Нет на складе' }).expect(200);

    const { body } = await agent.get(`/orders/${order.id}`).expect(200);
    expect(body.history.at(-1)).toMatchObject({ status: 'CANCELLED', comment: 'Нет на складе' });
    expect((await admin.get(`/admin/products/${product.id}`).expect(200)).body.stock).toBe(3);
  });

  it('шаблоны ответов: CRUD только для админа, название уникально', async () => {
    const { agent } = await registerUser(app);
    await agent.get('/admin/reply-templates').expect(403);

    const title = unique('Шаблон');
    const { body: created } = await admin.post('/admin/reply-templates').send({ title, text: ' Текст ' }).expect(201);
    expect(created).toMatchObject({ title, text: 'Текст' });
    await admin.post('/admin/reply-templates').send({ title, text: 'Другой' }).expect(409);
    await admin.post('/admin/reply-templates').send({ title: unique('Шаблон'), text: '' }).expect(400);

    await admin.patch(`/admin/reply-templates/${created.id}`).send({ text: 'Новый текст' }).expect(200);
    const list = await admin.get('/admin/reply-templates').expect(200);
    expect(list.body).toContainEqual(expect.objectContaining({ id: created.id, text: 'Новый текст' }));

    await admin.delete(`/admin/reply-templates/${created.id}`).expect(204);
    await admin.delete(`/admin/reply-templates/${created.id}`).expect(404);
    await admin.patch(`/admin/reply-templates/${created.id}`).send({ text: 'x' }).expect(404);
  });
});
