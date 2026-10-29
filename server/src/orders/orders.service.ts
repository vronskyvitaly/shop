import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, Prisma } from '@prisma/client';
import { paginate, toPage } from '../common/pagination.js';
import { EVENTS, type OrderStatusChangedEvent } from '../events/events.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ShopGateway } from '../realtime/shop.gateway.js';
import { CreateOrderDto, FindOrdersQuery, UpdateOrderStatusDto } from './dto/order.dto.js';
import { NEXT_STATUSES, USER_CANCEL_WINDOW_MS, USER_CANCELLABLE, deliveryPrice } from './order-status.js';

// Заказ целиком: позиции и история статусов (от старых к новым)
const orderInclude = {
  items: { orderBy: { id: 'asc' } },
  history: { orderBy: { createdAt: 'asc' } },
} as const satisfies Prisma.OrderInclude;

type Tx = Prisma.TransactionClient;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ShopGateway,
    private readonly events: EventEmitter2,
  ) {}

  // ───────── Покупатель ─────────

  findMine(userId: number, query: FindOrdersQuery) {
    return this.list({ userId, status: query.status }, query);
  }

  async findMineOne(id: number, userId: number) {
    // Чужой заказ → 404, а не 403: не раскрываем, что заказ с таким номером существует
    const order = await this.prisma.order.findFirst({ where: { id, userId }, include: orderInclude });
    if (!order) throw new NotFoundException(`Заказ ${id} не найден`);
    return order;
  }

  // Оформление из корзины. Всё в одной транзакции: если какого-то товара не хватит,
  // ни остатки, ни корзина, ни заказ не изменятся
  async create(userId: number, dto: CreateOrderDto) {
    const order = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cartItem.findMany({ where: { userId }, include: { product: true } });
      if (cart.length === 0) throw new BadRequestException('Корзина пуста');

      for (const { product, quantity } of cart) {
        if (!product.isActive) throw new ConflictException(`Товар «${product.title}» больше не продаётся`);
        // Условие stock >= quantity прямо в UPDATE: два одновременных заказа не уведут остаток в минус
        const { count } = await tx.product.updateMany({
          where: { id: product.id, stock: { gte: quantity } },
          data: { stock: { decrement: quantity }, salesCount: { increment: quantity } },
        });
        if (count === 0) {
          throw new ConflictException(`Товара «${product.title}» осталось ${product.stock} шт. — уменьшите количество`);
        }
      }

      const itemsTotal = cart.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0);
      const delivery = deliveryPrice(dto.deliveryMethod, itemsTotal);
      const created = await tx.order.create({
        data: {
          userId,
          ...dto,
          itemsTotal,
          deliveryPrice: delivery,
          total: itemsTotal + delivery,
          // Онлайн-оплата пока имитируется: считаем, что прошла сразу. Наличные — при получении
          isPaid: dto.paymentMethod === 'CARD_ONLINE',
          items: {
            create: cart.map(({ product, quantity }) => ({
              productId: product.id,
              title: product.title,
              icon: product.icon,
              price: product.price,
              quantity,
            })),
          },
          history: { create: { status: 'PENDING' } },
        },
        include: orderInclude,
      });
      await tx.cartItem.deleteMany({ where: { userId } });
      return created;
    });

    this.gateway.orderCreated(order);
    this.gateway.cartChanged(userId);
    this.gateway.catalogChanged(); // остатки изменились
    return order;
  }

  async cancelMine(id: number, userId: number) {
    const order = await this.findMineOne(id, userId);
    if (!USER_CANCELLABLE.includes(order.status)) {
      throw new ConflictException('Заказ уже собирается — отменить его можно только через поддержку');
    }
    // Время считаем на сервере: часы на устройстве покупателя могут врать
    if (Date.now() - order.createdAt.getTime() > USER_CANCEL_WINDOW_MS) {
      throw new ConflictException('Отменить заказ можно в течение 15 минут после оформления — обратитесь в поддержку');
    }
    return this.changeStatus(order.id, order.status, 'CANCELLED', 'Отменён покупателем');
  }

  // ───────── Администратор ─────────

  findAll(query: FindOrdersQuery) {
    return this.list({ status: query.status }, query, true);
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { ...orderInclude, user: { select: { id: true, email: true, name: true } } },
    });
    if (!order) throw new NotFoundException(`Заказ ${id} не найден`);
    return order;
  }

  async updateStatus(id: number, dto: UpdateOrderStatusDto) {
    const order = await this.findOne(id);
    if (!NEXT_STATUSES[order.status].includes(dto.status)) {
      throw new BadRequestException(`Нельзя перевести заказ из ${order.status} в ${dto.status}`);
    }
    // Покупатель должен понимать, почему магазин отменил его заказ: причина попадёт в историю
    if (dto.status === 'CANCELLED' && !dto.comment) throw new BadRequestException('Укажите причину отмены');
    await this.changeStatus(order.id, order.status, dto.status, dto.comment);
    return this.findOne(id);
  }

  // ───────── Общее ─────────

  private async list(where: Prisma.OrderWhereInput, query: FindOrdersQuery, withUser = false) {
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { items: { orderBy: { id: 'asc' } }, user: withUser ? { select: { id: true, email: true, name: true } } : false },
        ...paginate(query),
      }),
      this.prisma.order.count({ where }),
    ]);
    return toPage(items, total, query);
  }

  private async changeStatus(id: number, from: OrderStatus, to: OrderStatus, comment?: string) {
    const order = await this.prisma.$transaction(async (tx) => {
      // Условие status: from — защита от гонки: два админа одновременно меняют статус одного заказа
      const { count } = await tx.order.updateMany({
        where: { id, status: from },
        // Наличные считаются оплаченными в момент получения
        data: { status: to, ...(to === 'DELIVERED' ? { isPaid: true } : {}) },
      });
      if (count === 0) throw new ConflictException('Статус заказа уже изменился, обновите страницу');
      await tx.orderStatusHistory.create({ data: { orderId: id, status: to, comment } });
      if (to === 'CANCELLED') await this.restock(tx, id);
      return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    });

    this.gateway.orderUpdated(order);
    if (to === 'CANCELLED') this.gateway.catalogChanged();
    // Склад и доставка узнают о заказе только отсюда. emitAsync ждёт слушателей: к ответу API
    // задания уже созданы (и тесты не гоняются с обработчиками). Ошибка слушателя ответ не ломает
    await this.events.emitAsync(EVENTS.ORDER_STATUS_CHANGED, {
      orderId: order.id,
      from,
      to,
      order: {
        deliveryMethod: order.deliveryMethod,
        paymentMethod: order.paymentMethod,
        isPaid: order.isPaid,
        total: order.total,
        recipientName: order.recipientName,
        phone: order.phone,
        address: order.address,
        comment: order.comment,
        items: order.items.map(({ title, icon, quantity }) => ({ title, icon, quantity })),
      },
    } satisfies OrderStatusChangedEvent);
    return order;
  }

  // Смена статуса по событию сотрудника (склад, доставка). Если статус уже другой (админ успел сам) — пропускаем
  async advanceByStaff(id: number, from: OrderStatus, to: OrderStatus, comment: string) {
    try {
      await this.changeStatus(id, from, to, comment);
    } catch (error) {
      if (!(error instanceof ConflictException)) throw error;
      this.logger.warn(`Заказ ${id}: ${from} → ${to} пропущен — статус уже изменился`);
    }
  }

  // Отмена возвращает товары на склад (если товар не удалили)
  private async restock(tx: Tx, orderId: number) {
    const items = await tx.orderItem.findMany({ where: { orderId, productId: { not: null } } });
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId! },
        data: { stock: { increment: item.quantity }, salesCount: { decrement: item.quantity } },
      });
    }
  }
}
