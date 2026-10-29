import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  EVENTS,
  type OrderStatusChangedEvent,
  type OrderTaskEvent,
} from '../events/events.js';
import { DeliveryService } from './delivery.service.js';

@Injectable()
export class DeliveryListener {
  constructor(private readonly delivery: DeliveryService) {}

  @OnEvent(EVENTS.ORDER_STATUS_CHANGED, { async: true, promisify: true })
  onOrderStatusChanged(event: OrderStatusChangedEvent) {
    return this.delivery.syncWithOrder(event);
  }

  @OnEvent(EVENTS.PICK_COMPLETED, { async: true, promisify: true })
  onPickCompleted(event: OrderTaskEvent) {
    return this.delivery.markReady(event);
  }
}
