import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { AuthUser } from '../auth/auth.types.js';
import {
  EVENTS,
  type OrderStatusChangedEvent,
  type OrderTaskEvent,
} from '../events/events.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ShopGateway } from '../realtime/shop.gateway.js';

// Склад: задания на сборку заказов.
//   order.status.changed → CONFIRMED  — создаём задание (состав заказа копируется из события)
//   сборщик «Взять»                   → warehouse.pick.started   (orders переведёт заказ в «Собирается»)
//   сборщик «Собрано»                 → warehouse.pick.completed (delivery откроет задание курьерам)
// Модуль не знает про OrdersService и таблицу Order — только события из src/events

@Injectable()
export class WarehouseService {
  private readonly logger = new Logger(WarehouseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly gateway: ShopGateway,
  ) {}

  // Доска сборщика: свободные задания и те, что он собирает. Админ видит, кто что собирает
  findBoard(user: AuthUser) {
    const mine = user.role === 'ADMIN' ? {} : { pickerId: user.id };
    return this.prisma.pickTask.findMany({
      where: { OR: [{ status: 'NEW' }, { status: 'IN_PROGRESS', ...mine }] },
      include: { items: { orderBy: { id: 'asc' } } },
      orderBy: { createdAt: 'asc' }, // первым — тот, что ждёт дольше
    });
  }

  // Условие status: NEW в UPDATE — два сборщика не возьмут один заказ
  async take(id: number, user: AuthUser) {
    const task = await this.findTask(id);
    const { count } = await this.prisma.pickTask.updateMany({
      where: { id, status: 'NEW' },
      data: {
        status: 'IN_PROGRESS',
        pickerId: user.id,
        pickerName: user.email,
        startedAt: new Date(),
      },
    });
    if (count === 0)
      throw new ConflictException('Задание уже взял другой сборщик');
    await this.events.emitAsync(EVENTS.PICK_STARTED, {
      orderId: task.orderId,
    } satisfies OrderTaskEvent);
    this.gateway.warehouseChanged();
  }

  // Завершить может только тот, кто взял (или админ)
  async complete(id: number, user: AuthUser) {
    const task = await this.findTask(id);
    const { count } = await this.prisma.pickTask.updateMany({
      where: {
        id,
        status: 'IN_PROGRESS',
        ...(user.role === 'ADMIN' ? {} : { pickerId: user.id }),
      },
      data: { status: 'DONE', doneAt: new Date() },
    });
    if (count === 0) throw new ConflictException('Задание не в работе у вас');
    await this.events.emitAsync(EVENTS.PICK_COMPLETED, {
      orderId: task.orderId,
    } satisfies OrderTaskEvent);
    this.gateway.warehouseChanged();
  }

  // Синхронизация с заказом. Обработчик идемпотентный: то же событие повторно ничего не сломает
  // (с брокером сообщений повторная доставка — обычное дело)
  async syncWithOrder({ orderId, to, order }: OrderStatusChangedEvent) {
    if (to === 'CONFIRMED') {
      const exists = await this.prisma.pickTask.findUnique({
        where: { orderId },
        select: { id: true },
      });
      if (!exists) {
        await this.prisma.pickTask.create({
          data: { orderId, items: { create: order.items } },
        });
        this.logger.log(`Заказ ${orderId}: создано задание на сборку`);
      }
    } else if (to === 'CANCELLED') {
      await this.prisma.pickTask.updateMany({
        where: { orderId, status: { in: ['NEW', 'IN_PROGRESS'] } },
        data: { status: 'CANCELLED' },
      });
    } else if (to === 'SHIPPED' || to === 'DELIVERED') {
      // «Собирается», выставленное админом вручную, задание не трогает: оно остаётся свободным,
      // любой сборщик может его взять и отметить «Собрано» — иначе заказ завис бы без исполнителя
      // Админ продвинул заказ дальше — сборка точно закончена
      await this.prisma.pickTask.updateMany({
        where: { orderId, status: { in: ['NEW', 'IN_PROGRESS'] } },
        data: { status: 'DONE', doneAt: new Date() },
      });
    }
    this.gateway.warehouseChanged();
  }

  private async findTask(id: number) {
    const task = await this.prisma.pickTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException(`Задание ${id} не найдено`);
    return task;
  }
}
