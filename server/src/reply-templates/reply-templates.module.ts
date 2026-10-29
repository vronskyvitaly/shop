import { Module } from '@nestjs/common';
import { ReplyTemplatesController } from './reply-templates.controller.js';
import { ReplyTemplatesService } from './reply-templates.service.js';

@Module({
  controllers: [ReplyTemplatesController],
  providers: [ReplyTemplatesService],
})
export class ReplyTemplatesModule {}
