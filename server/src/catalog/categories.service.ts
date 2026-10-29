import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ShopGateway } from '../realtime/shop.gateway.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ShopGateway,
  ) {}

  // Для витрины: productsCount — только видимые товары
  async findAll() {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: { where: { isActive: true } } } },
      },
    });
    return categories.map(({ _count, ...category }) => ({
      ...category,
      productsCount: _count.products,
    }));
  }

  async create(dto: CreateCategoryDto) {
    const category = await this.prisma.category.create({ data: dto });
    this.gateway.catalogChanged();
    return category;
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.assertExists(id);
    const category = await this.prisma.category.update({
      where: { id },
      data: dto,
    });
    this.gateway.catalogChanged();
    return category;
  }

  // Категорию с товарами удалить нельзя (onDelete: Restrict → 409 через PrismaExceptionFilter)
  async remove(id: number) {
    await this.assertExists(id);
    await this.prisma.category.delete({ where: { id } });
    this.gateway.catalogChanged();
  }

  private async assertExists(id: number) {
    const found = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException(`Категория ${id} не найдена`);
  }
}
