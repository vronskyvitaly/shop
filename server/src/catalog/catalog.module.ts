import { Module } from '@nestjs/common';
import { AdminCategoriesController } from './admin-categories.controller.js';
import { AdminProductsController } from './admin-products.controller.js';
import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

// Отзывы — отдельный модуль src/reviews (модерация, свои контроллеры)
@Module({
  controllers: [
    CategoriesController,
    ProductsController,
    AdminCategoriesController,
    AdminProductsController,
  ],
  providers: [CategoriesService, ProductsService],
  exports: [ProductsService],
})
export class CatalogModule {}
