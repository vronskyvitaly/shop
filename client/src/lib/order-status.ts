export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'ASSEMBLING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type DeliveryMethod = 'COURIER' | 'PICKUP';
export type PaymentMethod = 'CARD_ONLINE' | 'CASH_ON_DELIVERY';

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Оформлен',
  CONFIRMED: 'Подтверждён',
  ASSEMBLING: 'Собирается',
  SHIPPED: 'В пути',
  DELIVERED: 'Получен',
  CANCELLED: 'Отменён',
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-blue-50 text-blue-700',
  CONFIRMED: 'bg-indigo-50 text-indigo-700',
  ASSEMBLING: 'bg-amber-50 text-amber-700',
  SHIPPED: 'bg-violet-50 text-violet-700',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-zinc-100 text-zinc-500',
};

// Шаги для шкалы прогресса заказа (отмена — отдельно)
export const STATUS_STEPS: OrderStatus[] = ['PENDING', 'CONFIRMED', 'ASSEMBLING', 'SHIPPED', 'DELIVERED'];

// Совпадает с NEXT_STATUSES на сервере (server/src/orders/order-status.ts)
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ASSEMBLING', 'CANCELLED'],
  ASSEMBLING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

// Покупатель отменяет сам, пока заказ не собирают, и только 15 минут после оформления.
// Совпадает с USER_CANCELLABLE и USER_CANCEL_WINDOW_MS на сервере (server/src/orders/order-status.ts)
export const USER_CANCELLABLE: OrderStatus[] = ['PENDING', 'CONFIRMED'];
export const USER_CANCEL_WINDOW_MS = 15 * 60 * 1000;

export const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  COURIER: 'Курьером',
  PICKUP: 'В пункт выдачи',
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CARD_ONLINE: 'Картой онлайн',
  CASH_ON_DELIVERY: 'При получении',
};

// Совпадает с deliveryPrice на сервере — чтобы показать итог до оформления
export const FREE_DELIVERY_FROM = 1500;
export const deliveryPrice = (method: DeliveryMethod, itemsTotal: number) =>
  method === 'PICKUP' || itemsTotal >= FREE_DELIVERY_FROM ? 0 : 199;
