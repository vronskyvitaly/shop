import { Module } from '@nestjs/common';
import { AdminOrdersController } from './admin-orders.controller.js';
import { OrdersController } from './orders.controller.js';
import { OrdersListener } from './orders.listener.js';
import { OrdersService } from './orders.service.js';

@Module({
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, OrdersListener],
})
export class OrdersModule {}
