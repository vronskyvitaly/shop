import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import { FindProductsQuery } from './dto/product.dto.js';
import { ProductsService } from './products.service.js';

// ───────── Витрина: доступна всем, в том числе гостям ─────────

@ApiTags('catalog')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  findAll(@Query() query: FindProductsQuery) {
    return this.products.findAll(query);
  }

  @Get(':id')
  @ApiNotFoundResponse({ description: 'Товар не найден или скрыт' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.products.findOne(id);
  }
}
