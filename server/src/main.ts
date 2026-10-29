import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { ACCESS_COOKIE } from './auth/auth.cookies.js';
import { setupApp } from './setup-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app); // куки, CORS, валидация, фильтр ошибок Prisma

  // Swagger UI: http://localhost:4500/docs, спецификация JSON: /docs-json
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Shop API')
    .setVersion('1.0')
    .addCookieAuth(ACCESS_COOKIE, { type: 'apiKey', in: 'cookie' }, ACCESS_COOKIE)
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(process.env.PORT ?? 4500);
}
await bootstrap();
