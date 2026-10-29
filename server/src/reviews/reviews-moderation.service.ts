import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { paginate, toPage } from '../common/pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ShopGateway } from '../realtime/shop.gateway.js';
import {
  ApproveReviewDto,
  RejectReviewDto,
} from './dto/moderate-review.dto.js';
import { FindReviewsQuery } from './dto/find-reviews.query.js';
import { ReviewsService } from './reviews.service.js';

// Модерация отзывов (админ): одобрить — опубликовать текущую версию, отклонить — с причиной для автора
@Injectable()
export class ReviewsModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviews: ReviewsService,
    private readonly gateway: ShopGateway,
  ) {}

  async findAll(query: FindReviewsQuery) {
    const where = { status: query.status };
    const [items, total, pendingCount] = await Promise.all([
      this.prisma.review.findMany({
        where,
        // Очередь — от старых к новым (кто дольше ждёт), архив — свежие сверху
        orderBy: { updatedAt: query.status === 'PENDING' ? 'asc' : 'desc' },
        include: {
          user: { select: { id: true, email: true, name: true } },
          product: { select: { id: true, title: true, icon: true } },
        },
        ...paginate(query),
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.count({ where: { status: 'PENDING' } }),
    ]);
    return { ...toPage(items, total, query), pendingCount };
  }

  async approve(id: number, { updatedAt }: ApproveReviewDto) {
    const review = await this.findPending(id, updatedAt);
    await this.prisma.$transaction(async (tx) => {
      // Условие по updatedAt — публикуем ровно ту версию, что видел админ
      const { count } = await tx.review.updateMany({
        where: { id, status: 'PENDING', updatedAt: new Date(updatedAt) },
        data: {
          status: 'APPROVED',
          publishedRating: review.rating,
          publishedText: review.text,
          publishedAt: new Date(),
          moderatorComment: null,
          moderatedAt: new Date(),
        },
      });
      if (count === 0) throw this.changedError();
      await this.reviews.recalcRating(tx, review.productId);
    });
    this.gateway.catalogChanged(); // рейтинг и число отзывов видны в каталоге
    this.gateway.reviewModerated({ ...review, status: 'APPROVED' });
  }

  // Отклонение не трогает опубликованную версию: если правку отклонили, на витрине остаётся прежний текст
  async reject(id: number, { updatedAt, comment }: RejectReviewDto) {
    const review = await this.findPending(id, updatedAt);
    const { count } = await this.prisma.review.updateMany({
      where: { id, status: 'PENDING', updatedAt: new Date(updatedAt) },
      data: {
        status: 'REJECTED',
        moderatorComment: comment,
        moderatedAt: new Date(),
      },
    });
    if (count === 0) throw this.changedError();
    this.gateway.reviewModerated({ ...review, status: 'REJECTED' });
  }

  private async findPending(id: number, updatedAt: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException(`Отзыв ${id} не найден`);
    if (review.status !== 'PENDING')
      throw new ConflictException('Отзыв уже проверен');
    if (review.updatedAt.getTime() !== new Date(updatedAt).getTime())
      throw this.changedError();
    return review;
  }

  private changedError() {
    return new ConflictException(
      'Автор изменил отзыв, пока вы его читали — обновите страницу',
    );
  }
}
