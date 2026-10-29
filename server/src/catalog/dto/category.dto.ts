import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PRODUCT_ICONS } from '../icons.js';
import { trim } from '../../common/transforms.js';

export class CreateCategoryDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  readonly name: string;

  @IsIn(PRODUCT_ICONS)
  readonly icon: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
