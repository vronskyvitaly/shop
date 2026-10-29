import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

// @Global: PrismaService доступен во всех модулях без imports: [PrismaModule]
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
