import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_COOKIE } from '../auth/auth.cookies.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ReviewDto } from './dto/review.dto.js';
import { ReviewsService } from './reviews.service.js';

// Отзывы на странице товара. Список доступен всем, в том числе гостям
@ApiTags('reviews')
@Controller('products/:productId/reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  findAll(@Param('productId', ParseIntPipe) productId: number) {
    return this.reviews.findPublished(productId);
  }

  // Может ли текущий пользователь оставить отзыв, и его собственный отзыв (если есть)
  @Get('eligibility')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth(ACCESS_COOKIE)
  eligibility(
    @Param('productId', ParseIntPipe) productId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reviews.eligibility(productId, user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth(ACCESS_COOKIE)
  @ApiForbiddenResponse({ description: 'Товар ещё не получен' })
  @ApiConflictResponse({ description: 'Отзыв уже есть' })
  create(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: ReviewDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reviews.create(productId, user.id, dto);
  }
}
