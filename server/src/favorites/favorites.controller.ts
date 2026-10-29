import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACCESS_COOKIE } from '../auth/auth.cookies.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { FavoritesService } from './favorites.service.js';

@ApiTags('favorites')
@ApiCookieAuth(ACCESS_COOKIE)
@ApiUnauthorizedResponse({ description: 'Не вошёл' })
@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.favorites.findAll(user.id);
  }

  @Put(':productId')
  @HttpCode(204)
  add(
    @Param('productId', ParseIntPipe) productId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.favorites.add(user.id, productId);
  }

  @Delete(':productId')
  @HttpCode(204)
  remove(
    @Param('productId', ParseIntPipe) productId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.favorites.remove(user.id, productId);
  }
}
