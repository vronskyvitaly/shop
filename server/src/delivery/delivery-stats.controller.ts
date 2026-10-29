import { Controller, Get, UseGuards } from '@nestjs/common';
import {
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
import { DeliveryStatsService } from './delivery-stats.service.js';

@ApiTags('delivery')
@ApiCookieAuth(ACCESS_COOKIE)
@ApiUnauthorizedResponse({ description: 'Не вошёл' })
@ApiForbiddenResponse({ description: 'Не курьер и не администратор' })
@Controller('delivery/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('COURIER', 'ADMIN')
export class DeliveryStatsController {
  constructor(private readonly stats: DeliveryStatsService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.stats.forUser(user);
  }
}
