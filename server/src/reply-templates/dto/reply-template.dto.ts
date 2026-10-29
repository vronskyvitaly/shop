import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { trim } from '../../common/transforms.js';

export class CreateReplyTemplateDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  readonly title: string;

  // Столько же, сколько комментарий к смене статуса (UpdateOrderStatusDto)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  readonly text: string;
}

export class UpdateReplyTemplateDto extends PartialType(
  CreateReplyTemplateDto,
) {}
