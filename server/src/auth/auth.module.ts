import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
// global: JwtService is available everywhere — JwtAuthGuard can be applied in any module.
// Secrets are not set here: access and refresh are signed with different keys in AuthService.
  imports: [JwtModule.register({ global: true }), UsersModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
