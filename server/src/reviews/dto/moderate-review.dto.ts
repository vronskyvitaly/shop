import { Transform } from 'class-transformer';
import { IsISO8601, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { trim } from '../../common/transforms.js';

// updatedAt — версия отзыва, которую видел админ. Если автор успел её изменить,
// модерация вернёт 409: нельзя одобрить текст, который админ не читал
export class ApproveReviewDto {
  @IsISO8601()
  readonly updatedAt: string;
}

export class RejectReviewDto extends ApproveReviewDto {
  // Причину увидит автор отзыва — без неё непонятно, что исправить
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Укажите причину отклонения' })
  @MaxLength(500)
  readonly comment: string;
}
