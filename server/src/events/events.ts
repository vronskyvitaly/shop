import type {
  DeliveryMethod,
  OrderStatus,
  PaymentMethod,
} from '@prisma/client';

// Контракт событий между модулями orders, warehouse и delivery.
// Модули не вызывают сервисы друг друга — только публикуют и слушают эти события (@nestjs/event-emitter).
// Если когда-нибудь вынести склад или доставку в отдельный сервис, эти же события пойдут через брокер
// (RabbitMQ, NATS), а payload останется тем же. Поэтому в нём только простые данные (JSON), без объектов Prisma

export const EVENTS = {
  // orders → все: статус заказа изменился (админ, покупатель или сотрудник через события ниже)
  ORDER_STATUS_CHANGED: 'order.status.changed',

  // warehouse → orders: сборщик взял заказ — заказ «Собирается»
  PICK_STARTED: 'warehouse.pick.started',
  // warehouse → delivery: заказ собран — курьер может забирать
  PICK_COMPLETED: 'warehouse.pick.completed',

  // delivery → orders: курьер забрал — заказ «В пути»
  DELIVERY_STARTED: 'delivery.started',
  // delivery → orders: вручено — заказ «Получен»
  DELIVERY_COMPLETED: 'delivery.completed',
} as const;

// Снимок заказа: всё, что нужно складу и доставке, чтобы не читать чужую таблицу Order
export interface OrderStatusChangedEvent {
  orderId: number;
  from: OrderStatus;
  to: OrderStatus;
  order: {
    deliveryMethod: DeliveryMethod;
    paymentMethod: PaymentMethod;
    isPaid: boolean;
    total: number;
    recipientName: string;
    phone: string;
    address: string;
    comment: string | null;
    items: { title: string; icon: string; quantity: number }[];
  };
}

export interface OrderTaskEvent {
  orderId: number;
}
