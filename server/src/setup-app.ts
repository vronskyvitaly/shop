import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { CLIENT_URL } from './client-url.js';
import { PrismaExceptionFilter } from './prisma/prisma-exception.filter.js';

// Общая настройка приложения: вызывается и в main.ts, и в e2e-тестах,
// чтобы тесты проверяли ровно то приложение, которое работает в проде
export function setupApp(app: INestApplication) {
  app.use(cookieParser()); // разбирает заголовок Cookie в req.cookies
  // Next.js-клиент на другом порту: разрешаем ему запросы с куками (credentials)
  app.enableCors({ origin: CLIENT_URL, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // убирает поля, которых нет в DTO
      forbidNonWhitelisted: true, // и возвращает 400, если такие поля прислали
      transform: true, // превращает JSON в экземпляр класса DTO
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter(app.get(HttpAdapterHost).httpAdapter));
}
