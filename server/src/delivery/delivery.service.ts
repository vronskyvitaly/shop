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

// Доставка: задания курьерам.
//   order.status.changed → CONFIRMED — создаём задание WAITING (адрес и получатель копируются из события)
//   warehouse.pick.completed        — заказ собран: READY, курьеры видят его в списке
//   курьер «Забрать»                → delivery.started   (orders переведёт заказ в «В пути»)
//   курьер «Вручено»                → delivery.completed (orders переведёт заказ в «Получен»)
// Модуль не знает про OrdersService, WarehouseService и таблицу Order — только события из src/events

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly gateway: ShopGateway,
  ) {}

  // Доска курьера: готовые к выдаче и те, что он везёт. Админ видит все в пути
  findBoard(user: AuthUser) {
    const mine = user.role === 'ADMIN' ? {} : { courierId: user.id };
    return this.prisma.deliveryTask.findMany({
      where: { OR: [{ status: 'READY' }, { status: 'IN_TRANSIT', ...mine }] },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Условие status: READY в UPDATE — два курьера не заберут один заказ
  async take(id: number, user: AuthUser) {
    const task = await this.findTask(id);
    const { count } = await this.prisma.deliveryTask.updateMany({
      where: { id, status: 'READY' },
      data: {
        status: 'IN_TRANSIT',
        courierId: user.id,
        courierName: user.email,
        takenAt: new Date(),
      },
    });
    if (count === 0)
      throw new ConflictException(
        'Заказ уже забрал другой курьер или он ещё не собран',
      );
    await this.events.emitAsync(EVENTS.DELIVERY_STARTED, {
      orderId: task.orderId,
    } satisfies OrderTaskEvent);
    this.gateway.deliveryChanged();
  }

  async complete(id: number, user: AuthUser) {
    const task = await this.findTask(id);
    const { count } = await this.prisma.deliveryTask.updateMany({
      where: {
        id,
        status: 'IN_TRANSIT',
        ...(user.role === 'ADMIN' ? {} : { courierId: user.id }),
      },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });
    if (count === 0) throw new ConflictException('Этот заказ везёт не вы');
    await this.events.emitAsync(EVENTS.DELIVERY_COMPLETED, {
      orderId: task.orderId,
    } satisfies OrderTaskEvent);
    this.gateway.deliveryChanged();
  }

  // Синхронизация с заказом. Идемпотентно: повтор события ничего не сломает
  async syncWithOrder({ orderId, to, order }: OrderStatusChangedEvent) {
    if (to === 'CONFIRMED') {
      const exists = await this.prisma.deliveryTask.findUnique({
        where: { orderId },
        select: { id: true },
      });
      if (!exists) {
        await this.prisma.deliveryTask.create({
          data: {
            orderId,
            deliveryMethod: order.deliveryMethod,
            address: order.address,
            recipientName: order.recipientName,
            phone: order.phone,
            comment: order.comment,
            itemsCount: order.items.reduce(
              (sum, item) => sum + item.quantity,
              0,
            ),
            total: order.total,
            cashToCollect: order.isPaid ? 0 : order.total,
          },
        });
        this.logger.log(`Заказ ${orderId}: создано задание на доставку`);
      }
    } else if (to === 'CANCELLED') {
      await this.prisma.deliveryTask.updateMany({
        where: { orderId, status: { in: ['WAITING', 'READY', 'IN_TRANSIT'] } },
        data: { status: 'CANCELLED' },
      });
    } else if (to === 'SHIPPED') {
      // Админ сам отправил заказ без курьера в системе
      await this.prisma.deliveryTask.updateMany({
        where: { orderId, status: { in: ['WAITING', 'READY'] } },
        data: { status: 'IN_TRANSIT', takenAt: new Date() },
      });
    } else if (to === 'DELIVERED') {
      await this.prisma.deliveryTask.updateMany({
        where: { orderId, status: { in: ['WAITING', 'READY', 'IN_TRANSIT'] } },
        data: { status: 'DELIVERED', deliveredAt: new Date() },
      });
    }
    this.gateway.deliveryChanged();
  }

  // Склад собрал заказ — курьеры могут забирать
  async markReady({ orderId }: OrderTaskEvent) {
    await this.prisma.deliveryTask.updateMany({
      where: { orderId, status: 'WAITING' },
      data: { status: 'READY' },
    });
    this.gateway.deliveryChanged();
  }

  private async findTask(id: number) {
    const task = await this.prisma.deliveryTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException(`Задание ${id} не найдено`);
    return task;
  }
}
