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

// Статистика сборщика: сколько собрал сегодня и за неделю, среднее время сборки, очередь.
// Админ видит общие цифры по всем сборщикам
@Injectable()
export class WarehouseStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async forUser(user: AuthUser) {
    const mine = user.role === 'ADMIN' ? {} : { pickerId: user.id };
    const [done, total, queue, inProgress] = await Promise.all([
      this.prisma.pickTask.findMany({
        where: { ...mine, status: 'DONE', doneAt: { gte: statsPeriodStart() } },
        include: { items: { select: { quantity: true } } },
        orderBy: { doneAt: 'desc' },
      }),
      this.prisma.pickTask.count({ where: { ...mine, status: 'DONE' } }),
      this.prisma.pickTask.count({ where: { status: 'NEW' } }),
      this.prisma.pickTask.count({ where: { ...mine, status: 'IN_PROGRESS' } }),
    ]);

    const tasks = done.map((task) => ({
      orderId: task.orderId,
      units: task.items.reduce((sum, item) => sum + item.quantity, 0),
      minutes: minutesBetween(task.startedAt, task.doneAt),
      doneAt: task.doneAt!,
    }));
    const today = tasks.filter((task) => task.doneAt >= startOfDay());
    const units = (list: typeof tasks) =>
      list.reduce((sum, task) => sum + task.units, 0);

    return {
      today: { orders: today.length, units: units(today) },
      week: {
        orders: tasks.length,
        units: units(tasks),
        avgMinutes: averageMinutes(tasks.map((task) => task.minutes)),
      },
      total,
      queue,
      inProgress,
      days: countByDay(tasks.map((task) => task.doneAt)),
      recent: tasks.slice(0, RECENT_LIMIT),
    };
  }
}
