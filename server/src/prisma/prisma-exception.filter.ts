import { ArgumentsHost, Catch, ConflictException, NotFoundException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';

// Превращает известные ошибки Prisma в понятные HTTP-ответы вместо 500
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(e: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    switch (e.code) {
      case 'P2002': {
        // нарушение @unique: meta.target — список полей, например ['email']
        const target = e.meta?.target;
        const fields = Array.isArray(target) ? target.join(', ') : String(target);
        return super.catch(new ConflictException(`${String(e.meta?.modelName)} with this ${fields} already exists`), host);
      }
      case 'P2003':
        // нарушение внешнего ключа с onDelete: Restrict — например, удаляют категорию, в которой есть товары
        return super.catch(new ConflictException('Запись используется другими данными и не может быть удалена'), host);
      case 'P2025':
        // запись для update/delete не найдена
        return super.catch(new NotFoundException(`${String(e.meta?.modelName)} not found`), host);
      default:
        return super.catch(e, host);
    }
  }
}
