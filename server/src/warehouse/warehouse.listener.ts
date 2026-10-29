import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTS, type OrderStatusChangedEvent } from '../events/events.js';
import { WarehouseService } from './warehouse.service.js';

@Injectable()
export class WarehouseListener {
  constructor(private readonly warehouse: WarehouseService) {}

  @OnEvent(EVENTS.ORDER_STATUS_CHANGED, { async: true, promisify: true })
  onOrderStatusChanged(event: OrderStatusChangedEvent) {
    return this.warehouse.syncWithOrder(event);
  }
}
