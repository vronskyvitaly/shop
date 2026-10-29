import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import {
  averageMinutes,
  countByDay,
  minutesBetween,
  startOfDay,
  statsPeriodStart,
} from '../common/stats.js';
import { PrismaService } from '../prisma/prisma.service.js';

const RECENT_LIMIT = 5;

// Статистика курьера: доставлено сегодня и за неделю, наличные на руках, среднее время в пути.
// Админ видит общие цифры по всем курьерам
@Injectable()
export class DeliveryStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async forUser(user: AuthUser) {
    const mine = user.role === 'ADMIN' ? {} : { courierId: user.id };
    const [delivered, total, ready, waiting, inTransit] = await Promise.all([
      this.prisma.deliveryTask.findMany({
        where: {
          ...mine,
          status: 'DELIVERED',
          deliveredAt: { gte: statsPeriodStart() },
        },
        orderBy: { deliveredAt: 'desc' },
      }),
      this.prisma.deliveryTask.count({
        where: { ...mine, status: 'DELIVERED' },
      }),
      this.prisma.deliveryTask.count({ where: { status: 'READY' } }),
      this.prisma.deliveryTask.count({ where: { status: 'WAITING' } }),
      this.prisma.deliveryTask.count({
        where: { ...mine, status: 'IN_TRANSIT' },
      }),
    ]);

    const tasks = delivered.map((task) => ({
      orderId: task.orderId,
      address: task.address,
      cash: task.cashToCollect,
      minutes: minutesBetween(task.takenAt, task.deliveredAt),
      deliveredAt: task.deliveredAt!,
    }));
    const today = tasks.filter((task) => task.deliveredAt >= startOfDay());
    const cash = (list: typeof tasks) =>
      list.reduce((sum, task) => sum + task.cash, 0);

    return {
      today: { orders: today.length, cash: cash(today) },
      week: {
        orders: tasks.length,
        cash: cash(tasks),
        avgMinutes: averageMinutes(tasks.map((task) => task.minutes)),
      },
      total,
      ready,
      waiting, // ещё собираются на складе — скоро появятся в «Готовы к выдаче»
      inTransit,
      days: countByDay(tasks.map((task) => task.deliveredAt)),
      recent: tasks.slice(0, RECENT_LIMIT),
    };
  }
}
