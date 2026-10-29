import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACCESS_COOKIE } from '../auth/auth.cookies.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CartService } from './cart.service.js';
import { AddToCartDto, SetQuantityDto } from './dto/cart.dto.js';

@ApiTags('cart')
@ApiCookieAuth(ACCESS_COOKIE)
@ApiUnauthorizedResponse({ description: 'Не вошёл' })
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.cart.get(user.id);
  }

  @Post('items')
  @ApiBadRequestResponse({ description: 'Не хватает товара на складе' })
  add(@Body() dto: AddToCartDto, @CurrentUser() user: AuthUser) {
    return this.cart.add(user.id, dto.productId, dto.quantity);
  }

  @Patch('items/:productId')
  setQuantity(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: SetQuantityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cart.setQuantity(user.id, productId, dto.quantity);
  }

  @Delete('items/:productId')
  remove(
    @Param('productId', ParseIntPipe) productId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cart.remove(user.id, productId);
  }

  @Delete()
  clear(@CurrentUser() user: AuthUser) {
    return this.cart.clear(user.id);
  }
}
