import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQuery } from '../../common/pagination.js';

export class FindUsersQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly search?: string;
}
