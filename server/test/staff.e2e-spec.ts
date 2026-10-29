import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import {
  createProduct,
  createTestApp,
  orderForm,
  registerUser,
  type Agent,
} from './utils.js';

type PickTask = {
  id: number;
  orderId: number;
  status: string;
  items: { title: string; quantity: number }[];
};
type DeliveryTask = {
  id: number;
  orderId: number;
  status: string;
  address: string;
  cashToCollect: number;
};

// Склад и доставка: модули узнают о заказах только из событий, а заказ двигается по их событиям
describe('Сборщик и курьер (e2e)', () => {
  let app: INestApplication<App>;
  let admin: Agent;
  let picker: Agent;
  let picker2: Agent;
  let courier: Agent;

  const pickTask = async (as: Agent, orderId: number) =>
    ((await as.get('/warehouse/tasks').expect(200)).body as PickTask[]).find(
      (t) => t.orderId === orderId,
    );
  const deliveryTask = async (as: Agent, orderId: number) =>
    ((await as.get('/delivery/tasks').expect(200)).body as DeliveryTask[]).find(
      (t) => t.orderId === orderId,
    );

  // Покупатель оформляет заказ на 2 шт., админ подтверждает
  async function confirmedOrder() {
    const product = await createProduct(admin, { stock: 5 });
    const { agent: buyer } = await registerUser(app);
    await buyer
      .post('/cart/items')
      .send({ productId: product.id, quantity: 2 })
      .expect(201);
    const { body: order } = await buyer
      .post('/orders')
      .send(orderForm)
      .expect(201);
    await admin
      .patch(`/admin/orders/${order.id}/status`)
      .send({ status: 'CONFIRMED' })
      .expect(200);
    return { buyer, order: order as { id: number; total: number }, product };
  }

  beforeAll(async () => {
    app = await createTestApp();
    ({ agent: admin } = await registerUser(app, { admin: true }));
    ({ agent: picker } = await registerUser(app, { role: 'PICKER' }));
    ({ agent: picker2 } = await registerUser(app, { role: 'PICKER' }));
    ({ agent: courier } = await registerUser(app, { role: 'COURIER' }));
  });

  afterAll(async () => {
    await app.close();
  });

  it('доступ по ролям', async () => {
    const { agent: buyer } = await registerUser(app);
    await buyer.get('/warehouse/tasks').expect(403);
    await buyer.get('/delivery/tasks').expect(403);
    await courier.get('/warehouse/tasks').expect(403);
    await picker.get('/delivery/tasks').expect(403);
    await admin.get('/warehouse/tasks').expect(200);
    await admin.get('/delivery/tasks').expect(200);
  });

  it('полный путь: подтверждён → сборщик → курьер → получен', async () => {
    const { buyer, order, product } = await confirmedOrder();

    // Подтверждение создало задания: на сборку (с составом) и на доставку (ждёт сборки, курьеру не видно)
    const task = await pickTask(picker, order.id);
    expect(task).toMatchObject({
      status: 'NEW',
      items: [{ title: product.title, quantity: 2 }],
    });
    expect(await deliveryTask(courier, order.id)).toBeUndefined();

    // Сборщик взял → заказ «Собирается». Второй сборщик уже не возьмёт и не увидит чужое задание
    await picker.post(`/warehouse/tasks/${task!.id}/take`).expect(201);
    await picker2.post(`/warehouse/tasks/${task!.id}/take`).expect(409);
    expect(await pickTask(picker2, order.id)).toBeUndefined();
    expect(
      (await buyer.get(`/orders/${order.id}`).expect(200)).body.status,
    ).toBe('ASSEMBLING');

    // Собрал → задание у курьеров, наличные к оплате (оплата при получении)
    await picker2.post(`/warehouse/tasks/${task!.id}/complete`).expect(409); // не его задание
    await picker.post(`/warehouse/tasks/${task!.id}/complete`).expect(201);
    const delivery = await deliveryTask(courier, order.id);
    expect(delivery).toMatchObject({
      status: 'READY',
      address: orderForm.address,
      cashToCollect: order.total,
    });

    // Курьер забрал → «В пути», вручил → «Получен» и оплачен
    await courier.post(`/delivery/tasks/${delivery!.id}/take`).expect(201);
    expect(
      (await buyer.get(`/orders/${order.id}`).expect(200)).body.status,
    ).toBe('SHIPPED');
    await courier.post(`/delivery/tasks/${delivery!.id}/complete`).expect(201);

    const { body: done } = await buyer.get(`/orders/${order.id}`).expect(200);
    expect(done).toMatchObject({ status: 'DELIVERED', isPaid: true });
    expect(done.history.map((h: { status: string }) => h.status)).toEqual([
      'PENDING',
      'CONFIRMED',
      'ASSEMBLING',
      'SHIPPED',
      'DELIVERED',
    ]);
    expect(await deliveryTask(courier, order.id)).toBeUndefined(); // доставленные с доски уходят
  });

  it('курьер не забирает несобранный заказ', async () => {
    const { order } = await confirmedOrder();
    const tasks = (await admin.get('/delivery/tasks').expect(200))
      .body as DeliveryTask[];
    expect(tasks.find((t) => t.orderId === order.id)).toBeUndefined(); // WAITING на доске не показывается
  });

  it('отмена заказа снимает задания; ручные статусы админа синхронизируют задания', async () => {
    const cancelled = await confirmedOrder();
    await admin
      .patch(`/admin/orders/${cancelled.order.id}/status`)
      .send({ status: 'CANCELLED', comment: 'Нет на складе' })
      .expect(200);
    expect(await pickTask(picker, cancelled.order.id)).toBeUndefined();

    // Админ вручную поставил «Собирается» — сборщик всё равно может взять и собрать заказ
    const assembling = await confirmedOrder();
    await admin
      .patch(`/admin/orders/${assembling.order.id}/status`)
      .send({ status: 'ASSEMBLING' })
      .expect(200);
    const task = await pickTask(picker, assembling.order.id);
    expect(task?.status).toBe('NEW');
    await picker.post(`/warehouse/tasks/${task!.id}/take`).expect(201);
    await picker.post(`/warehouse/tasks/${task!.id}/complete`).expect(201);
    expect((await deliveryTask(courier, assembling.order.id))?.status).toBe(
      'READY',
    );

    // Админ сам ведёт заказ дальше (сотрудников нет) — задания не зависают на досках
    const manual = await confirmedOrder();
    for (const status of ['ASSEMBLING', 'SHIPPED']) {
      await admin
        .patch(`/admin/orders/${manual.order.id}/status`)
        .send({ status })
        .expect(200);
    }
    expect(await pickTask(admin, manual.order.id)).toBeUndefined();
    const delivery = await deliveryTask(admin, manual.order.id);
    expect(delivery?.status).toBe('IN_TRANSIT');
    await admin
      .patch(`/admin/orders/${manual.order.id}/status`)
      .send({ status: 'DELIVERED' })
      .expect(200);
    expect(await deliveryTask(admin, manual.order.id)).toBeUndefined();
  });

  it('статистика: свои цифры у сотрудника, общие у админа, покупателю закрыто', async () => {
    type Stats = {
      today: { orders: number };
      total: number;
      days: { count: number }[];
      recent: { orderId: number }[];
    };
    const stats = async (as: Agent, url: string) =>
      (await as.get(url).expect(200)).body as Stats;

    const pickerBefore = await stats(picker2, '/warehouse/stats');
    const courierBefore = await stats(courier, '/delivery/stats');
    const adminBefore = await stats(admin, '/warehouse/stats');

    const { order } = await confirmedOrder();
    const task = (await pickTask(picker2, order.id))!;
    await picker2.post(`/warehouse/tasks/${task.id}/take`).expect(201);
    await picker2.post(`/warehouse/tasks/${task.id}/complete`).expect(201);
    const delivery = (await deliveryTask(courier, order.id))!;
    await courier.post(`/delivery/tasks/${delivery.id}/take`).expect(201);
    await courier.post(`/delivery/tasks/${delivery.id}/complete`).expect(201);

    const pickerAfter = await stats(picker2, '/warehouse/stats');
    expect(pickerAfter.today.orders).toBe(pickerBefore.today.orders + 1);
    expect(pickerAfter.total).toBe(pickerBefore.total + 1);
    expect(pickerAfter.days).toHaveLength(7);
    expect(pickerAfter.days.at(-1)!.count).toBe(pickerAfter.today.orders);
    expect(pickerAfter.recent[0]).toMatchObject({
      orderId: order.id,
      units: 2,
    });

    const courierAfter = await stats(courier, '/delivery/stats');
    expect(courierAfter.today.orders).toBe(courierBefore.today.orders + 1);
    expect(courierAfter.recent[0]).toMatchObject({ orderId: order.id });

    // Сборщик видит только свои сборки, админ — все
    expect((await stats(picker, '/warehouse/stats')).recent).not.toContainEqual(
      expect.objectContaining({ orderId: order.id }),
    );
    expect((await stats(admin, '/warehouse/stats')).total).toBe(
      adminBefore.total + 1,
    );

    const { agent: buyer } = await registerUser(app);
    await buyer.get('/warehouse/stats').expect(403);
    await buyer.get('/delivery/stats').expect(403);
    await picker.get('/delivery/stats').expect(403);
  });
});
