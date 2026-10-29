import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACCESS_COOKIE } from '../auth/auth.cookies.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateOrderDto, FindOrdersQuery } from './dto/order.dto.js';
import { OrdersService } from './orders.service.js';

@ApiTags('orders')
@ApiCookieAuth(ACCESS_COOKIE)
@ApiUnauthorizedResponse({ description: 'Не вошёл' })
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  findMine(@Query() query: FindOrdersQuery, @CurrentUser() user: AuthUser) {
    return this.orders.findMine(user.id, query);
  }

  @Get(':id')
  @ApiNotFoundResponse({ description: 'Заказ не найден' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.findMineOne(id, user.id);
  }

  @Post()
  @ApiBadRequestResponse({ description: 'Корзина пуста или данные неверны' })
  @ApiConflictResponse({ description: 'Товара не хватает на складе' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthUser) {
    return this.orders.create(user.id, dto);
  }

  @Post(':id/cancel')
  @ApiConflictResponse({ description: 'Заказ уже собирается' })
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.orders.cancelMine(id, user.id);
  }
}
