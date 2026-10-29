import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';

// Только сервис: регистрация — в AuthController, список пользователей — в админке
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
