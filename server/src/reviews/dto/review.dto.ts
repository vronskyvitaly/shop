import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { trim } from '../../common/transforms.js';

// Новый отзыв и правка своего — одни и те же поля; оба уходят на модерацию
export class ReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  readonly rating: number;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  readonly text: string;
}
