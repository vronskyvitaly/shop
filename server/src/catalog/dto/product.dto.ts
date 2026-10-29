import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQuery } from '../../common/pagination.js';
import { PRODUCT_ICONS } from '../icons.js';
import { trim } from '../../common/transforms.js';

const MAX_PRICE = 10_000_000;

export class CreateProductDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  readonly title: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  readonly description: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  readonly brand?: string | null;

  // Целые рубли
  @IsInt()
  @Min(1)
  @Max(MAX_PRICE)
  readonly price: number;

  // Цена до скидки; null — скидки нет
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PRICE)
  readonly oldPrice?: number | null;

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  readonly stock: number;

  @IsIn(PRODUCT_ICONS)
  readonly icon: string;

  @IsInt()
  readonly categoryId: number;

  // false — товар скрыт из каталога
  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export const PRODUCT_SORTS = [
  'popular',
  'price_asc',
  'price_desc',
  'new',
  'rating',
] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

// GET /products?search=наушники&categoryId=2&minPrice=1000&maxPrice=5000&sort=price_asc&page=1
export class FindProductsQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  readonly minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  readonly maxPrice?: number;

  @IsOptional()
  @IsIn(PRODUCT_SORTS)
  readonly sort?: ProductSort;
}

// Фильтр по остатку в админке: low — заканчивается (1…LOW_STOCK шт.), out — нет в наличии
export const STOCK_FILTERS = ['low', 'out'] as const;
export type StockFilter = (typeof STOCK_FILTERS)[number];

export class AdminFindProductsQuery extends FindProductsQuery {
  @IsOptional()
  @IsIn(STOCK_FILTERS)
  readonly stock?: StockFilter;
}
