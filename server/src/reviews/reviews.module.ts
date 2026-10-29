import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { AdminReviewsController } from './admin-reviews.controller.js';
import { MyReviewsController } from './my-reviews.controller.js';
import { ReviewsModerationService } from './reviews-moderation.service.js';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

@Module({
  imports: [CatalogModule],
  controllers: [ReviewsController, MyReviewsController, AdminReviewsController],
  providers: [ReviewsService, ReviewsModerationService],
})
export class ReviewsModule {}
