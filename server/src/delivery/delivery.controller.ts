import {
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
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACCESS_COOKIE } from '../auth/auth.cookies.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import { DeliveryService } from './delivery.service.js';

@ApiTags('delivery')
@ApiCookieAuth(ACCESS_COOKIE)
@ApiUnauthorizedResponse({ description: 'Не вошёл' })
@ApiForbiddenResponse({ description: 'Не курьер и не администратор' })
@Controller('delivery/tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('COURIER', 'ADMIN')
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Get()
  findBoard(@CurrentUser() user: AuthUser) {
    return this.delivery.findBoard(user);
  }

  @Post(':id/take')
  @ApiConflictResponse({
    description: 'Заказ уже забрал другой курьер или он ещё не собран',
  })
  async take(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.delivery.take(id, user);
    return this.delivery.findBoard(user);
  }

  @Post(':id/complete')
  @ApiConflictResponse({ description: 'Заказ везёт другой курьер' })
  async complete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.delivery.complete(id, user);
    return this.delivery.findBoard(user);
  }
}
