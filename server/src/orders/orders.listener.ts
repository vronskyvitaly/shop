import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTS, type OrderTaskEvent } from '../events/events.js';
import { OrdersService } from './orders.service.js';

// Заказ двигается по статусам по событиям склада и доставки. Модули orders не знает,
// кто их прислал: склад и доставку можно вынести в отдельные сервисы, этот файл не изменится
@Injectable()
export class OrdersListener {
  constructor(private readonly orders: OrdersService) {}

  @OnEvent(EVENTS.PICK_STARTED, { async: true, promisify: true })
  onPickStarted({ orderId }: OrderTaskEvent) {
    return this.orders.advanceByStaff(
      orderId,
      'CONFIRMED',
      'ASSEMBLING',
      'Сборщик начал собирать заказ',
    );
  }

  @OnEvent(EVENTS.DELIVERY_STARTED, { async: true, promisify: true })
  onDeliveryStarted({ orderId }: OrderTaskEvent) {
    return this.orders.advanceByStaff(
      orderId,
      'ASSEMBLING',
      'SHIPPED',
      'Курьер забрал заказ',
    );
  }

  @OnEvent(EVENTS.DELIVERY_COMPLETED, { async: true, promisify: true })
  onDeliveryCompleted({ orderId }: OrderTaskEvent) {
    return this.orders.advanceByStaff(
      orderId,
      'SHIPPED',
      'DELIVERED',
      'Заказ вручён',
    );
  }
}
