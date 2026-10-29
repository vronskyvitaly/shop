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
import { WarehouseService } from './warehouse.service.js';

@ApiTags('warehouse')
@ApiCookieAuth(ACCESS_COOKIE)
@ApiUnauthorizedResponse({ description: 'Не вошёл' })
@ApiForbiddenResponse({ description: 'Не сборщик и не администратор' })
@Controller('warehouse/tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PICKER', 'ADMIN')
export class WarehouseController {
  constructor(private readonly warehouse: WarehouseService) {}

  @Get()
  findBoard(@CurrentUser() user: AuthUser) {
    return this.warehouse.findBoard(user);
  }

  @Post(':id/take')
  @ApiConflictResponse({ description: 'Задание уже взял другой сборщик' })
  async take(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.warehouse.take(id, user);
    return this.warehouse.findBoard(user);
  }

  @Post(':id/complete')
  @ApiConflictResponse({ description: 'Задание не в работе у этого сборщика' })
  async complete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.warehouse.complete(id, user);
    return this.warehouse.findBoard(user);
  }
}
