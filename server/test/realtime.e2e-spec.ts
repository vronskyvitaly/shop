import type { INestApplication } from '@nestjs/common';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import type { App } from 'supertest/types.js';
import { createProduct, createTestApp, orderForm, registerUser, type Agent } from './utils.js';

// Настоящий socket.io-клиент против настоящего сервера
describe('WebSocket /shop (e2e)', () => {
  let app: INestApplication<App>;
  let url: string;
  let admin: Agent;
  let adminToken: string;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    await app.listen(0); // случайный свободный порт
    const { port } = (app.getHttpServer() as unknown as { address(): AddressInfo }).address();
    url = `http://localhost:${port}/shop`;
    ({ agent: admin, accessToken: adminToken } = await registerUser(app, { admin: true }));
  });

  afterEach(() => {
    sockets.splice(0).forEach((socket) => socket.disconnect());
  });

  afterAll(async () => {
    await app.close();
  });

  // В браузере кука уходит сама (withCredentials), в Node передаём её заголовком
  async function connect(accessToken?: string): Promise<Socket> {
    const socket = io(url, {
      transports: ['websocket'],
      reconnection: false,
      extraHeaders: accessToken ? { cookie: `shop_access_token=${accessToken}` } : {},
    });
    sockets.push(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', reject);
    });
    await new Promise((r) => setTimeout(r, 50)); // сервер успевает добавить сокет в комнаты
    return socket;
  }

  // Собирает все события сокета, чтобы потом проверить, что пришло, а что нет
  function record(socket: Socket) {
    const events: { event: string; data: unknown }[] = [];
    socket.onAny((event: string, data: unknown) => events.push({ event, data }));
    return events;
  }

  const tick = () => new Promise((r) => setTimeout(r, 150));

  it('гость подключается и получает catalog:changed', async () => {
    const guest = record(await connect());
    await createProduct(admin);
    await tick();
    expect(guest.some((e) => e.event === 'catalog:changed')).toBe(true);
  });

  it('новый заказ и смена статуса: владельцу и админам, но не другим покупателям', async () => {
    const product = await createProduct(admin);
    const buyer = await registerUser(app);
    const stranger = await registerUser(app);
    const buyerEvents = record(await connect(buyer.accessToken));
    const strangerEvents = record(await connect(stranger.accessToken));
    const adminEvents = record(await connect(adminToken));

    await buyer.agent.post('/cart/items').send({ productId: product.id }).expect(201);
    const { body: order } = await buyer.agent.post('/orders').send(orderForm).expect(201);
    await admin.patch(`/admin/orders/${order.id}/status`).send({ status: 'CONFIRMED' }).expect(200);
    await tick();

    const orderEvents = (events: typeof buyerEvents) => events.filter((e) => e.event.startsWith('order:'));
    expect(orderEvents(buyerEvents)).toEqual([
      { event: 'order:created', data: { id: order.id } },
      { event: 'order:updated', data: { id: order.id, status: 'CONFIRMED' } },
    ]);
    expect(orderEvents(adminEvents)).toHaveLength(2);
    expect(orderEvents(strangerEvents)).toHaveLength(0);
    expect(buyerEvents.some((e) => e.event === 'cart:changed')).toBe(true);
    expect(strangerEvents.some((e) => e.event === 'cart:changed')).toBe(false);
  });

  it('невалидный токен → auth:expired и разрыв соединения', async () => {
    const socket = io(url, { transports: ['websocket'], reconnection: false, extraHeaders: { cookie: 'shop_access_token=broken' } });
    sockets.push(socket);
    const expired = new Promise<void>((resolve) => socket.once('auth:expired', () => resolve()));
    const disconnected = new Promise<string>((resolve) => socket.once('disconnect', resolve));
    await expired;
    expect(await disconnected).toBe('io server disconnect');
  });
});
