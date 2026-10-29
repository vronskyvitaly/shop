import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PHONE_PATTERN } from '../../common/patterns.js';
import { trim, trimOrNull } from '../../common/transforms.js';

// Поля и ограничения те же, что у получателя в CreateOrderDto: адрес подставляется в заказ как есть
export class CreateAddressDto {
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(30)
  readonly label?: string | null;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly recipientName: string;

  @Transform(trim)
  @Matches(PHONE_PATTERN, { message: 'Введите корректный телефон' })
  readonly phone: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  readonly address: string;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
