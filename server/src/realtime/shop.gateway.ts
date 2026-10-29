import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { OrderStatus, ReviewStatus } from '@prisma/client';
import { Namespace, Socket } from 'socket.io';
import { ACCESS_COOKIE } from '../auth/auth.cookies.js';
import type { AccessPayload } from '../auth/auth.types.js';
import { CLIENT_URL } from '../client-url.js';

// Комнаты: все подключения пользователя (вкладки, устройства), администраторы, сборщики и курьеры
const userRoom = (userId: number) => `user:${userId}`;
const ADMINS_ROOM = 'admins';
const PICKERS_ROOM = 'pickers';
const COURIERS_ROOM = 'couriers';

// Достаёт значение куки из заголовка Cookie: "a=1; shop_access_token=xxx"
function readCookie(
  header: string | undefined,
  name: string,
): string | undefined {
  for (const part of header?.split(';') ?? []) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
}

// Socket.IO namespace /shop: клиенты подключаются к http://localhost:4500/shop.
//   Гость (без куки)   — получает только общие события каталога.
//   Покупатель         — ещё события о своих заказах, корзине и избранном.
//   Администратор      — ещё события обо всех заказах (новый заказ, смена статуса)
//   Сборщик / курьер   — ещё изменения заданий склада / доставки
// addTrailingSlash: false — принимать и /socket.io?…, и /socket.io/?…: прокси Next (rewrites) срезает слеш в конце
@WebSocketGateway({
  namespace: 'shop',
  cors: { origin: CLIENT_URL, credentials: true },
  addTrailingSlash: false,
})
export class ShopGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ShopGateway.name);

  @WebSocketServer()
  server: Namespace;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // HTTP-guard на сокеты не действует, поэтому access-куку проверяем при подключении сами
  async handleConnection(client: Socket) {
    const token = readCookie(client.handshake.headers.cookie, ACCESS_COOKIE);
    if (!token) return; // гость

    try {
      const payload = await this.jwt.verifyAsync<AccessPayload>(token, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      });
      await client.join(userRoom(payload.sub));
      if (payload.role === 'ADMIN') await client.join(ADMINS_ROOM);
      if (payload.role === 'PICKER') await client.join(PICKERS_ROOM);
      if (payload.role === 'COURIER') await client.join(COURIERS_ROOM);
    } catch {
      // Кука есть, но токен истёк: разрываем — клиент сделает refresh и переподключится уже с новой кукой
      client.emit('auth:expired');
      client.disconnect(true);
      this.logger.debug(`Expired token, disconnected ${client.id}`);
    }
  }

  // Товары или категории изменились (админ отредактировал, заказ уменьшил остаток) — всем
  catalogChanged() {
    this.server.emit('catalog:changed');
  }

  // Админ изменил баннеры — карусель на главной обновится у всех
  bannersChanged() {
    this.server.emit('banners:changed');
  }

  // Новый заказ — владельцу (другие вкладки) и администраторам
  orderCreated(order: { id: number; userId: number }) {
    this.server
      .to([userRoom(order.userId), ADMINS_ROOM])
      .emit('order:created', { id: order.id });
  }

  // Смена статуса — владельцу и администраторам
  orderUpdated(order: { id: number; userId: number; status: OrderStatus }) {
    this.server
      .to([userRoom(order.userId), ADMINS_ROOM])
      .emit('order:updated', { id: order.id, status: order.status });
  }

  // Задания на сборку изменились (новый заказ подтверждён, кто-то взял задание) — сборщикам и админам
  warehouseChanged() {
    this.server.to([PICKERS_ROOM, ADMINS_ROOM]).emit('warehouse:changed');
  }

  // Задания на доставку изменились — курьерам и админам
  deliveryChanged() {
    this.server.to([COURIERS_ROOM, ADMINS_ROOM]).emit('delivery:changed');
  }

  // Новый или отредактированный отзыв ждёт модерации — админам (счётчик в меню, список)
  reviewsChanged() {
    this.server.to(ADMINS_ROOM).emit('reviews:changed');
  }

  // Отзыв одобрен или отклонён — автору (уведомление) и админам (другие вкладки)
  reviewModerated(review: {
    id: number;
    userId: number;
    productId: number;
    status: ReviewStatus;
  }) {
    this.server
      .to([userRoom(review.userId), ADMINS_ROOM])
      .emit('review:moderated', {
        id: review.id,
        productId: review.productId,
        status: review.status,
      });
  }

  // Корзина и избранное изменились в другой вкладке/устройстве
  cartChanged(userId: number) {
    this.server.to(userRoom(userId)).emit('cart:changed');
  }

  favoritesChanged(userId: number) {
    this.server.to(userRoom(userId)).emit('favorites:changed');
  }
}
