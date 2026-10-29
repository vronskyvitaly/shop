import type { DeliveryMethod, OrderStatus } from '@prisma/client';

// Куда можно перевести заказ из каждого статуса. Назад нельзя: доставленный заказ не станет «собирается»
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ASSEMBLING', 'CANCELLED'],
  ASSEMBLING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

// Покупатель может отменить сам, пока заказ не начали собирать…
export const USER_CANCELLABLE: OrderStatus[] = ['PENDING', 'CONFIRMED'];
// …и только в первые 15 минут после оформления. Дальше — через поддержку (админ отменяет с причиной).
// То же значение на клиенте (client/src/lib/order-status.ts) — для обратного отсчёта на кнопке
export const USER_CANCEL_WINDOW_MS = 15 * 60 * 1000;

// Доставка: самовывоз бесплатно, курьер — бесплатно от FREE_DELIVERY_FROM
export const FREE_DELIVERY_FROM = 1500;
const COURIER_PRICE = 199;

export function deliveryPrice(method: DeliveryMethod, itemsTotal: number): number {
  if (method === 'PICKUP') return 0;
  return itemsTotal >= FREE_DELIVERY_FROM ? 0 : COURIER_PRICE;
}
