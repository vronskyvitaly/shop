import { Module } from '@nestjs/common';
import { DeliveryStatsController } from './delivery-stats.controller.js';
import { DeliveryStatsService } from './delivery-stats.service.js';
import { DeliveryController } from './delivery.controller.js';
import { DeliveryListener } from './delivery.listener.js';
import { DeliveryService } from './delivery.service.js';

@Module({
  controllers: [DeliveryController, DeliveryStatsController],
  providers: [DeliveryService, DeliveryStatsService, DeliveryListener],
})
export class DeliveryModule {}
