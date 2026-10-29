import { Global, Module } from '@nestjs/common';
import { ShopGateway } from './shop.gateway.js';

// @Global: любой сервис может уведомить клиентов через ShopGateway без imports
@Global()
@Module({
  providers: [ShopGateway],
  exports: [ShopGateway],
})
export class RealtimeModule {}
