import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACCESS_COOKIE } from '../auth/auth.cookies.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AddressesService } from './addresses.service.js';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto.js';

@ApiTags('addresses')
@ApiCookieAuth(ACCESS_COOKIE)
@ApiUnauthorizedResponse({ description: 'Не вошёл' })
@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.addresses.findAll(user.id);
  }

  @Post()
  @ApiBadRequestResponse({
    description: 'Неверные данные или достигнут лимит адресов',
  })
  create(@Body() dto: CreateAddressDto, @CurrentUser() user: AuthUser) {
    return this.addresses.create(user.id, dto);
  }

  @Patch(':id')
  @ApiNotFoundResponse({ description: 'Адрес не найден' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.addresses.update(id, user.id, dto);
  }

  // Возвращает весь список: флаг isDefault поменялся у двух адресов
  @Post(':id/default')
  @HttpCode(200)
  @ApiNotFoundResponse({ description: 'Адрес не найден' })
  makeDefault(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.addresses.makeDefault(id, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNotFoundResponse({ description: 'Адрес не найден' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.addresses.remove(id, user.id);
  }
}
