import { ReviewStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQuery } from '../../common/pagination.js';

// ?status=PENDING&page=2 — очередь модерации (по умолчанию — ждущие проверки)
export class FindReviewsQuery extends PaginationQuery {
  @IsOptional()
  @IsEnum(ReviewStatus)
  readonly status: ReviewStatus = ReviewStatus.PENDING;
}
