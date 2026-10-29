import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AddressesModule } from './addresses/addresses.module.js';
import { AdminModule } from './admin/admin.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BannersModule } from './banners/banners.module.js';
import { CartModule } from './cart/cart.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { DeliveryModule } from './delivery/delivery.module.js';
import { FavoritesModule } from './favorites/favorites.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { ReplyTemplatesModule } from './reply-templates/reply-templates.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { UsersModule } from './users/users.module.js';
import { WarehouseModule } from './warehouse/warehouse.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // читает .env, ConfigService доступен везде
    // Внутренняя шина событий: orders ↔ warehouse ↔ delivery общаются только через неё (src/events)
    EventEmitterModule.forRoot(),
    PrismaModule,
    RealtimeModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    ReviewsModule,
    BannersModule,
    CartModule,
    FavoritesModule,
    OrdersModule,
    AddressesModule,
    WarehouseModule, // сборщики — знает о заказах только из событий
    DeliveryModule, // курьеры — тоже
    ReplyTemplatesModule,
    AdminModule,
  ],
})
export class AppModule {}
