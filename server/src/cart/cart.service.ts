import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ShopGateway } from '../realtime/shop.gateway.js';

const productSelect = {
  id: true,
  title: true,
  brand: true,
  price: true,
  oldPrice: true,
  icon: true,
  stock: true,
  isActive: true,
} as const;

// Каждый метод возвращает корзину целиком: клиенту не нужно пересчитывать суммы самому
@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ShopGateway,
  ) {}

  async get(userId: number) {
    const rows = await this.prisma.cartItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { quantity: true, product: { select: productSelect } },
    });
    const items = rows.map(({ quantity, product }) => ({
      productId: product.id,
      quantity,
      product,
      // Товар скрыли или его раскупили, пока он лежал в корзине — оформить заказ с ним нельзя
      available: product.isActive && product.stock >= quantity,
    }));
    const sum = (price: (item: (typeof items)[number]) => number) =>
      items.reduce((total, item) => total + price(item) * item.quantity, 0);
    return {
      items,
      count: items.reduce((total, item) => total + item.quantity, 0),
      itemsTotal: sum((item) => item.product.price),
      // Сумма без скидок — чтобы показать «Ваша выгода»
      oldItemsTotal: sum((item) => item.product.oldPrice ?? item.product.price),
      hasUnavailable: items.some((item) => !item.available),
    };
  }

  // Повторное добавление того же товара увеличивает количество
  async add(userId: number, productId: number, quantity: number) {
    const product = await this.findAvailable(productId);
    const existing = await this.prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    const total = (existing?.quantity ?? 0) + quantity;
    this.assertStock(product.stock, total);
    await this.prisma.cartItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId, quantity },
      update: { quantity: total },
    });
    return this.changed(userId);
  }

  async setQuantity(userId: number, productId: number, quantity: number) {
    await this.findLine(userId, productId);
    const product = await this.findAvailable(productId);
    this.assertStock(product.stock, quantity);
    await this.prisma.cartItem.update({
      where: { userId_productId: { userId, productId } },
      data: { quantity },
    });
    return this.changed(userId);
  }

  async remove(userId: number, productId: number) {
    await this.findLine(userId, productId);
    await this.prisma.cartItem.delete({
      where: { userId_productId: { userId, productId } },
    });
    return this.changed(userId);
  }

  async clear(userId: number) {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
    return this.changed(userId);
  }

  // Уведомляем другие вкладки и отдаём свежую корзину
  private changed(userId: number) {
    this.gateway.cartChanged(userId);
    return this.get(userId);
  }

  private async findAvailable(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: productSelect,
    });
    if (!product || !product.isActive)
      throw new NotFoundException(`Товар ${productId} не найден`);
    return product;
  }

  private async findLine(userId: number, productId: number) {
    const line = await this.prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (!line) throw new NotFoundException('Товара нет в корзине');
    return line;
  }

  private assertStock(stock: number, wanted: number) {
    if (wanted > stock) {
      throw new BadRequestException(
        stock === 0 ? 'Товар закончился' : `На складе только ${stock} шт.`,
      );
    }
  }
}
