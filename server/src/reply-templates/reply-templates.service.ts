import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateReplyTemplateDto,
  UpdateReplyTemplateDto,
} from './dto/reply-template.dto.js';

@Injectable()
export class ReplyTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.replyTemplate.findMany({ orderBy: { title: 'asc' } });
  }

  // Повтор названия → P2002 → 409 (PrismaExceptionFilter)
  create(dto: CreateReplyTemplateDto) {
    return this.prisma.replyTemplate.create({ data: dto });
  }

  // Несуществующий id → P2025 → 404 (PrismaExceptionFilter)
  update(id: number, dto: UpdateReplyTemplateDto) {
    return this.prisma.replyTemplate.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    const { count } = await this.prisma.replyTemplate.deleteMany({
      where: { id },
    });
    if (count === 0) throw new NotFoundException(`Шаблон ${id} не найден`);
  }
}
