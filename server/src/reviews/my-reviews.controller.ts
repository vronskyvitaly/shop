import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACCESS_COOKIE } from '../auth/auth.cookies.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ReviewDto } from './dto/review.dto.js';
import { ReviewsService } from './reviews.service.js';

// Мои отзывы: статусы модерации и правка своего отзыва
@ApiTags('reviews')
@ApiCookieAuth(ACCESS_COOKIE)
@ApiUnauthorizedResponse({ description: 'Не вошёл' })
@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class MyReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('mine')
  findMine(@CurrentUser() user: AuthUser) {
    return this.reviews.findMine(user.id);
  }

  // Правка уходит на модерацию заново
  @Patch(':id')
  @ApiNotFoundResponse({
    description: 'Нет такого отзыва у этого пользователя',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reviews.update(id, user.id, dto);
  }
}
