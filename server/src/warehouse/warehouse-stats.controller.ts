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
import { WarehouseStatsService } from './warehouse-stats.service.js';

@ApiTags('warehouse')
@ApiCookieAuth(ACCESS_COOKIE)
@ApiUnauthorizedResponse({ description: 'Не вошёл' })
@ApiForbiddenResponse({ description: 'Не сборщик и не администратор' })
@Controller('warehouse/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PICKER', 'ADMIN')
export class WarehouseStatsController {
  constructor(private readonly stats: WarehouseStatsService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.stats.forUser(user);
  }
}
