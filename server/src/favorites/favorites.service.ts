import { Injectable, NotFoundException } from '@nestjs/common';
import { productInclude } from '../catalog/products.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ShopGateway } from '../realtime/shop.gateway.js';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ShopGateway,
  ) {}

  // Товары из избранного, последние добавленные — первыми. Скрытые товары тоже показываем (с пометкой на клиенте)
  async findAll(userId: number) {
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { product: { include: productInclude } },
    });
    return rows.map((row) => row.product);
  }

  // PUT и DELETE идемпотентны: повторное нажатие «сердечка» не даёт ошибку
  async add(userId: number, productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { isActive: true },
    });
    if (!product?.isActive)
      throw new NotFoundException(`Товар ${productId} не найден`);
    await this.prisma.favorite.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
    this.gateway.favoritesChanged(userId);
  }

  async remove(userId: number, productId: number) {
    await this.prisma.favorite.deleteMany({ where: { userId, productId } });
    this.gateway.favoritesChanged(userId);
  }
}
