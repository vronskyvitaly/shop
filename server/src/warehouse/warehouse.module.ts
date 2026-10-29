import { Module } from '@nestjs/common';
import { WarehouseStatsController } from './warehouse-stats.controller.js';
import { WarehouseStatsService } from './warehouse-stats.service.js';
import { WarehouseController } from './warehouse.controller.js';
import { WarehouseListener } from './warehouse.listener.js';
import { WarehouseService } from './warehouse.service.js';

@Module({
  controllers: [WarehouseController, WarehouseStatsController],
  providers: [WarehouseService, WarehouseStatsService, WarehouseListener],
})
export class WarehouseModule {}
