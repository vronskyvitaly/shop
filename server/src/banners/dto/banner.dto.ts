import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PRODUCT_ICONS } from '../../catalog/icons.js';
import { trim, trimOrNull } from '../../common/transforms.js';
import { BANNER_COLORS } from '../banners.constants.js';

export class CreateBannerDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  readonly title: string;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(150)
  readonly subtitle?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(30)
  readonly buttonText?: string | null;

  // Только внутренний путь: «/…», но не «//evil.com» и не «/\evil.com» — браузер считает их ссылкой
  // на другой сайт. Иначе баннер можно использовать, чтобы увести покупателя на фишинговую страницу
  @Transform(trim)
  @Matches(/^\/(?![/\\])[^\s\\]*$/, {
    message:
      'Ссылка должна быть путём внутри магазина, например /?categoryId=1',
  })
  @MaxLength(300)
  readonly link: string;

  @IsIn(BANNER_COLORS)
  readonly color: string;

  @IsIn(PRODUCT_ICONS)
  readonly icon: string;

  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;

  // ISO-дата или null (без ограничения)
  @IsOptional()
  @IsDateString()
  readonly startsAt?: string | null;

  @IsOptional()
  @IsDateString()
  readonly endsAt?: string | null;
}

export class UpdateBannerDto extends PartialType(CreateBannerDto) {}

export class ReorderBannersDto {
  // id баннеров в новом порядке
  @IsArray()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  readonly ids: number[];
}
