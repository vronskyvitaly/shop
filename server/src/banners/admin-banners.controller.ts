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
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACCESS_COOKIE } from '../auth/auth.cookies.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import { BannersService } from './banners.service.js';
import {
  CreateBannerDto,
  ReorderBannersDto,
  UpdateBannerDto,
} from './dto/banner.dto.js';

@ApiTags('admin')
@ApiCookieAuth(ACCESS_COOKIE)
@ApiUnauthorizedResponse({ description: 'Не вошёл' })
@ApiForbiddenResponse({ description: 'Не администратор' })
@Controller('admin/banners')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminBannersController {
  constructor(private readonly banners: BannersService) {}

  @Get()
  findAll() {
    return this.banners.findAll();
  }

  @Get(':id')
  @ApiNotFoundResponse({ description: 'Баннер не найден' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.banners.findOne(id);
  }

  @Post()
  @ApiBadRequestResponse({ description: 'Неверные данные или период показа' })
  create(@Body() dto: CreateBannerDto) {
    return this.banners.create(dto);
  }

  @Put('order')
  reorder(@Body() dto: ReorderBannersDto) {
    return this.banners.reorder(dto.ids);
  }

  @Patch(':id')
  @ApiNotFoundResponse({ description: 'Баннер не найден' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBannerDto) {
    return this.banners.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNotFoundResponse({ description: 'Баннер не найден' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.banners.remove(id);
  }
}
