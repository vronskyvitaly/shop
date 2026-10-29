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
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACCESS_COOKIE } from '../auth/auth.cookies.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import {
  CreateReplyTemplateDto,
  UpdateReplyTemplateDto,
} from './dto/reply-template.dto.js';
import { ReplyTemplatesService } from './reply-templates.service.js';

@ApiTags('admin')
@ApiCookieAuth(ACCESS_COOKIE)
@ApiUnauthorizedResponse({ description: 'Не вошёл' })
@ApiForbiddenResponse({ description: 'Не администратор' })
@Controller('admin/reply-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ReplyTemplatesController {
  constructor(private readonly templates: ReplyTemplatesService) {}

  @Get()
  findAll() {
    return this.templates.findAll();
  }

  @Post()
  @ApiConflictResponse({ description: 'Шаблон с таким названием уже есть' })
  create(@Body() dto: CreateReplyTemplateDto) {
    return this.templates.create(dto);
  }

  @Patch(':id')
  @ApiNotFoundResponse({ description: 'Шаблон не найден' })
  @ApiConflictResponse({ description: 'Шаблон с таким названием уже есть' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReplyTemplateDto,
  ) {
    return this.templates.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNotFoundResponse({ description: 'Шаблон не найден' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.templates.remove(id);
  }
}
