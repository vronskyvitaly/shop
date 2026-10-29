import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// ?page=2&limit=24 — общая часть всех списков с пагинацией
export class PaginationQuery {
  @IsOptional()
  @Type(() => Number) // в query всё приходит строкой: "2" → 2
  @IsInt()
  @Min(1)
  readonly page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit: number = 24;
}

// Ответ любого списка с пагинацией
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export const toPage = <T>(
  items: T[],
  total: number,
  { page, limit }: PaginationQuery,
): Page<T> => ({
  items,
  total,
  page,
  pages: Math.max(1, Math.ceil(total / limit)),
});

// skip/take для Prisma
export const paginate = ({ page, limit }: PaginationQuery) => ({
  skip: (page - 1) * limit,
  take: limit,
});
