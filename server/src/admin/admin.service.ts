import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types.js';
import { LOW_STOCK } from '../catalog/stock.js';
import { paginate, toPage } from '../common/pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FindUsersQuery } from './dto/find-users.query.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [
      productsCount,
      hiddenCount,
      usersCount,
      ordersByStatus,
      revenue,
      lowStock,
      recentOrders,
      pendingReviews,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isActive: false } }),
      this.prisma.user.count(),
      this.prisma.order.groupBy({ by: ['status'], _count: true }),
      // Выручка — только по доставленным заказам
      this.prisma.order.aggregate({
        where: { status: 'DELIVERED' },
        _sum: { total: true },
      }),
      this.prisma.product.findMany({
        where: { isActive: true, stock: { lte: LOW_STOCK } },
        orderBy: { stock: 'asc' },
        take: 5,
        select: { id: true, title: true, icon: true, stock: true },
      }),
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { email: true, name: true } } },
      }),
      this.prisma.review.count({ where: { status: 'PENDING' } }),
    ]);
    return {
      productsCount,
      hiddenCount,
      usersCount,
      ordersCount: ordersByStatus.reduce((sum, row) => sum + row._count, 0),
      ordersByStatus: Object.fromEntries(
        ordersByStatus.map((row) => [row.status, row._count]),
      ),
      revenue: revenue._sum.total ?? 0,
      lowStock,
      recentOrders,
      pendingReviews, // отзывы на модерации — счётчик в меню админки
    };
  }

  async users(query: FindUsersQuery) {
    const search = query.search?.trim().toLowerCase();
    const where: Prisma.UserWhereInput = search
      ? { email: { contains: search } }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { id: 'asc' },
        omit: { password: true },
        include: { _count: { select: { orders: true } } },
        ...paginate(query),
      }),
      this.prisma.user.count({ where }),
    ]);
    return toPage(
      items.map(({ _count, ...user }) => ({
        ...user,
        ordersCount: _count.orders,
      })),
      total,
      query,
    );
  }

  // Новая роль действует со следующего refresh токенов (роль лежит в access-токене, живёт 15 минут)
  async updateRole(id: number, role: Role, currentUser: AuthUser) {
    // Иначе можно случайно остаться без единого администратора
    if (id === currentUser.id)
      throw new BadRequestException('Нельзя изменить собственную роль');
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException(`Пользователь ${id} не найден`);
    if (user.role === 'ADMIN')
      throw new BadRequestException('Роль администратора не меняется');
    return this.prisma.user.update({
      where: { id },
      data: { role },
      omit: { password: true },
    });
  }
}
