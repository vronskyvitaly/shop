import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate, toPage } from '../common/pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ShopGateway } from '../realtime/shop.gateway.js';
import {
  AdminFindProductsQuery,
  CreateProductDto,
  ProductSort,
  StockFilter,
  UpdateProductDto,
} from './dto/product.dto.js';
import { LOW_STOCK } from './stock.js';

// Товар в ответах API: вместе с названием категории
export const productInclude = {
  category: { select: { id: true, name: true } },
} as const;

const ORDER_BY: Record<ProductSort, Prisma.ProductOrderByWithRelationInput[]> =
  {
    popular: [{ salesCount: 'desc' }, { id: 'desc' }],
    price_asc: [{ price: 'asc' }],
    price_desc: [{ price: 'desc' }],
    new: [{ createdAt: 'desc' }],
    rating: [{ rating: 'desc' }, { reviewsCount: 'desc' }],
  };

const STOCK_WHERE: Record<StockFilter, Prisma.IntFilter> = {
  low: { gt: 0, lte: LOW_STOCK },
  out: { equals: 0 },
};

const toSearchText = (title: string, brand?: string | null) =>
  `${title} ${brand ?? ''}`.toLowerCase();

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ShopGateway,
  ) {}

  // Каталог. includeHidden — для админки: показывает и скрытые товары.
  // stock (фильтр по остатку) приходит только из админки: публичный FindProductsQuery его не пропустит
  async findAll(query: AdminFindProductsQuery, { includeHidden = false } = {}) {
    const where: Prisma.ProductWhereInput = {
      isActive: includeHidden ? undefined : true,
      stock: query.stock && STOCK_WHERE[query.stock],
      categoryId: query.categoryId,
      price: { gte: query.minPrice, lte: query.maxPrice },
      // Каждое слово запроса должно встретиться: «наушники sony» найдёт «Наушники Sony WH-1000XM5»
      AND: query.search
        ?.toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => ({ searchText: { contains: word } })),
    };
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: productInclude,
        // В фильтре по остатку первыми — те, что кончатся раньше
        orderBy: [
          ...(query.stock ? [{ stock: 'asc' as const }] : []),
          ...ORDER_BY[query.sort ?? 'popular'],
        ],
        ...paginate(query),
      }),
      this.prisma.product.count({ where }),
    ]);
    return toPage(items, total, query);
  }

  // Скрытый товар покупателю не показываем (404), а админу — да
  async findOne(id: number, { includeHidden = false } = {}) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product || (!product.isActive && !includeHidden))
      throw new NotFoundException(`Товар ${id} не найден`);
    return product;
  }

  async create(dto: CreateProductDto) {
    this.assertPrices(dto.price, dto.oldPrice);
    const product = await this.prisma.product.create({
      data: { ...dto, searchText: toSearchText(dto.title, dto.brand) },
      include: productInclude,
    });
    this.gateway.catalogChanged();
    return product;
  }

  async update(id: number, dto: UpdateProductDto) {
    const current = await this.findOne(id, { includeHidden: true });
    this.assertPrices(
      dto.price ?? current.price,
      dto.oldPrice === undefined ? current.oldPrice : dto.oldPrice,
    );
    const title = dto.title ?? current.title;
    const brand = dto.brand === undefined ? current.brand : dto.brand;
    const product = await this.prisma.product.update({
      where: { id },
      data: { ...dto, searchText: toSearchText(title, brand) },
      include: productInclude,
    });
    this.gateway.catalogChanged();
    return product;
  }

  // Удаление чистит корзины и избранное (Cascade), а в старых заказах остаётся снимок товара (SetNull).
  // Чтобы просто убрать товар с витрины, лучше скрыть его: isActive = false
  async remove(id: number) {
    await this.findOne(id, { includeHidden: true });
    await this.prisma.product.delete({ where: { id } });
    this.gateway.catalogChanged();
  }

  private assertPrices(price: number, oldPrice: number | null | undefined) {
    if (oldPrice != null && oldPrice <= price) {
      throw new BadRequestException('Старая цена должна быть больше текущей');
    }
  }
}
