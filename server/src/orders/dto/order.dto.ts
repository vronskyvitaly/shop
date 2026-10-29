import { DeliveryMethod, OrderStatus, PaymentMethod } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationQuery } from '../../common/pagination.js';
import { PHONE_PATTERN } from '../../common/patterns.js';
import { trim } from '../../common/transforms.js';

export class CreateOrderDto {
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

  @IsEnum(DeliveryMethod)
  readonly deliveryMethod: DeliveryMethod;

  @IsEnum(PaymentMethod)
  readonly paymentMethod: PaymentMethod;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  readonly comment?: string;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  readonly status: OrderStatus;

  // Комментарий попадёт в историю заказа и будет виден покупателю. При отмене обязателен —
  // это причина (проверяет OrdersService.updateStatus)
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  readonly comment?: string;
}

export class FindOrdersQuery extends PaginationQuery {
  @IsOptional()
  @IsEnum(OrderStatus)
  readonly status?: OrderStatus;
}
