import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ProductsService } from '../catalog/products.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ShopGateway } from '../realtime/shop.gateway.js';
import { ReviewDto } from './dto/review.dto.js';

type Tx = Prisma.TransactionClient;

// Свой отзыв автор видит целиком: статус, причину отклонения, что сейчас опубликовано
const OWN_REVIEW_SELECT = {
  id: true,
  productId: true,
  rating: true,
  text: true,
  status: true,
  publishedRating: true,
  publishedText: true,
  moderatorComment: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ReviewSelect;

// Отзывы покупателей. Новый отзыв и любая правка уходят на модерацию (ReviewsModerationService);
// на витрине — только одобренная версия
@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
    private readonly gateway: ShopGateway,
  ) {}

  // Витрина: только опубликованные, в одобренной версии
  async findPublished(productId: number) {
    await this.products.findOne(productId);
    const reviews = await this.prisma.review.findMany({
      where: { productId, publishedText: { not: null } },
      orderBy: { createdAt: 'desc' },
      // Покупателю показываем только имя автора, без email
      include: { user: { select: { name: true } } },
    });
    return reviews.map((review) => ({
      id: review.id,
      rating: review.publishedRating!,
      text: review.publishedText!,
      createdAt: review.createdAt,
      edited:
        review.publishedAt!.getTime() > review.createdAt.getTime() + 60_000,
      user: review.user,
    }));
  }

  // Как на маркетплейсах: отзыв — только от того, кто получил товар, и только один (его можно править)
  async eligibility(productId: number, userId: number) {
    const [purchased, review] = await Promise.all([
      this.hasReceived(productId, userId),
      this.findOwn(productId, userId),
    ]);
    return { canReview: purchased && !review, purchased, review };
  }

  // Все свои отзывы — для страницы заказа (статус у каждого товара)
  findMine(userId: number) {
    return this.prisma.review.findMany({
      where: { userId },
      select: OWN_REVIEW_SELECT,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(productId: number, userId: number, dto: ReviewDto) {
    await this.products.findOne(productId);
    if (!(await this.hasReceived(productId, userId))) {
      throw new ForbiddenException(
        'Отзыв можно оставить после получения товара',
      );
    }
    if (await this.findOwn(productId, userId)) {
      throw new ConflictException(
        'Вы уже оставили отзыв на этот товар — его можно изменить',
      );
    }
    const review = await this.prisma.review.create({
      data: { productId, userId, rating: dto.rating, text: dto.text },
      select: OWN_REVIEW_SELECT,
    });
    this.gateway.reviewsChanged();
    return review;
  }

  // Правка снова отправляет отзыв на модерацию; опубликованная версия пока остаётся на витрине
  async update(id: number, userId: number, dto: ReviewDto) {
    const { count } = await this.prisma.review.updateMany({
      where: { id, userId },
      data: {
        rating: dto.rating,
        text: dto.text,
        status: 'PENDING',
        moderatorComment: null,
        moderatedAt: null,
      },
    });
    if (count === 0) throw new NotFoundException(`Отзыв ${id} не найден`);
    this.gateway.reviewsChanged();
    return this.prisma.review.findUniqueOrThrow({
      where: { id },
      select: OWN_REVIEW_SELECT,
    });
  }

  // Рейтинг товара — только по опубликованным версиям. Вызывается в транзакции модерации
  async recalcRating(tx: Tx, productId: number) {
    const stats = await tx.review.aggregate({
      where: { productId, publishedRating: { not: null } },
      _avg: { publishedRating: true },
      _count: true,
    });
    await tx.product.update({
      where: { id: productId },
      data: {
        rating: Math.round((stats._avg.publishedRating ?? 0) * 10) / 10,
        reviewsCount: stats._count,
      },
    });
  }

  private async hasReceived(productId: number, userId: number) {
    const item = await this.prisma.orderItem.findFirst({
      where: { productId, order: { userId, status: 'DELIVERED' } },
      select: { id: true },
    });
    return Boolean(item);
  }

  private findOwn(productId: number, userId: number) {
    return this.prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
      select: OWN_REVIEW_SELECT,
    });
  }
}
