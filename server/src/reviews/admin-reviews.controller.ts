import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACCESS_COOKIE } from '../auth/auth.cookies.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import { FindReviewsQuery } from './dto/find-reviews.query.js';
import {
  ApproveReviewDto,
  RejectReviewDto,
} from './dto/moderate-review.dto.js';
import { ReviewsModerationService } from './reviews-moderation.service.js';

@ApiTags('admin')
@ApiCookieAuth(ACCESS_COOKIE)
@ApiUnauthorizedResponse({ description: 'Не вошёл' })
@ApiForbiddenResponse({ description: 'Не администратор' })
@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminReviewsController {
  constructor(private readonly moderation: ReviewsModerationService) {}

  @Get()
  findAll(@Query() query: FindReviewsQuery) {
    return this.moderation.findAll(query);
  }

  @Post(':id/approve')
  @HttpCode(204)
  @ApiConflictResponse({
    description: 'Отзыв уже проверен или автор его изменил',
  })
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveReviewDto,
  ) {
    return this.moderation.approve(id, dto);
  }

  @Post(':id/reject')
  @HttpCode(204)
  @ApiConflictResponse({
    description: 'Отзыв уже проверен или автор его изменил',
  })
  reject(@Param('id', ParseIntPipe) id: number, @Body() dto: RejectReviewDto) {
    return this.moderation.reject(id, dto);
  }
}
