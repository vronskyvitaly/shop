import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createProduct, createTestApp, registerUser, unique, type Agent } from './utils.js';

describe('Каталог (e2e)', () => {
  let app: INestApplication<App>;
  let admin: Agent;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    ({ agent: admin } = await registerUser(app, { admin: true }));
  });

  afterAll(async () => {
    await app.close();
  });

  it('гость видит каталог и карточку товара', async () => {
    const product = await createProduct(admin);
    const list = await http().get('/products').query({ categoryId: product.categoryId }).expect(200);
    expect(list.body).toMatchObject({ total: 1, page: 1, pages: 1 });
    expect(list.body.items[0]).toMatchObject({ id: product.id, category: { id: product.categoryId } });
    await http().get(`/products/${product.id}`).expect(200);
  });

  it('поиск по кириллице без учёта регистра и по нескольким словам', async () => {
    const word = unique('Пылесос').toUpperCase();
    const product = await createProduct(admin, { title: `${word} моющий`, brand: 'Dyson' });
    const res = await http().get('/products').query({ search: `${word.toLowerCase()} dyson` }).expect(200);
    expect(res.body.items.map((p: { id: number }) => p.id)).toEqual([product.id]);
  });

  it('фильтр по цене и сортировка', async () => {
    const cheap = await createProduct(admin, { price: 100, oldPrice: null });
    const { categoryId } = cheap;
    await admin
      .post('/admin/products')
      .send({ title: 'Дорогой', description: 'd', price: 9000, stock: 1, icon: 'gift', categoryId })
      .expect(201);
    const asc = await http().get('/products').query({ categoryId, sort: 'price_asc' }).expect(200);
    expect(asc.body.items.map((p: { price: number }) => p.price)).toEqual([100, 9000]);
    const filtered = await http().get('/products').query({ categoryId, minPrice: 500 }).expect(200);
    expect(filtered.body.total).toBe(1);
  });

  it('скрытый товар не виден покупателю, но виден админу', async () => {
    const product = await createProduct(admin, { isActive: false });
    await http().get(`/products/${product.id}`).expect(404);
    await admin.get(`/admin/products/${product.id}`).expect(200);
  });

  it('валидация: старая цена должна быть больше новой, иконка — из списка', async () => {
    const product = await createProduct(admin);
    await admin.patch(`/admin/products/${product.id}`).send({ oldPrice: 500 }).expect(400);
    await admin.patch(`/admin/products/${product.id}`).send({ icon: 'unknown-icon' }).expect(400);
  });

  it('категорию с товарами удалить нельзя (409), пустую — можно', async () => {
    const product = await createProduct(admin);
    await admin.delete(`/admin/categories/${product.categoryId}`).expect(409);
    const empty = await admin.post('/admin/categories').send({ name: unique('Пустая'), icon: 'book' }).expect(201);
    await admin.delete(`/admin/categories/${empty.body.id}`).expect(204);
  });
  it('админ: фильтр по остатку — заканчивается и нет в наличии, публично недоступен', async () => {
    const product = await createProduct(admin, { stock: 3 });
    const { categoryId } = product;
    // Ещё два товара в той же категории: закончившийся и с запасом
    const newProduct = (stock: number) =>
      admin.post('/admin/products').send({ title: unique('Товар'), description: 'Описание', price: 100, stock, icon: 'package', categoryId }).expect(201);
    const { body: soldOut } = await newProduct(0);
    await newProduct(50);

    const low = await admin.get('/admin/products').query({ categoryId, stock: 'low' }).expect(200);
    expect(low.body.items.map((p: { id: number }) => p.id)).toEqual([product.id]);
    const none = await admin.get('/admin/products').query({ categoryId, stock: 'out' }).expect(200);
    expect(none.body.items.map((p: { id: number }) => p.id)).toEqual([soldOut.id]);
    expect((await admin.get('/admin/products').query({ categoryId }).expect(200)).body.total).toBe(3);

    await admin.get('/admin/products').query({ stock: 'many' }).expect(400);
    await http().get('/products').query({ stock: 'low' }).expect(400);
  });
});
