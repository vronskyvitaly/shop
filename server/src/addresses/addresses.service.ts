import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MAX_ADDRESSES } from './addresses.constants.js';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto.js';

// Основной адрес — первым, остальные в порядке добавления
const ORDER_BY = [{ isDefault: 'desc' as const }, { id: 'asc' as const }];

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: number) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: ORDER_BY,
    });
  }

  create(userId: number, dto: CreateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { userId } });
      if (count >= MAX_ADDRESSES)
        throw new BadRequestException(
          `Можно сохранить не больше ${MAX_ADDRESSES} адресов`,
        );
      // Первый адрес сразу основной: при оформлении заказа будет что подставить
      return tx.address.create({
        data: { ...dto, userId, isDefault: count === 0 },
      });
    });
  }

  async update(id: number, userId: number, dto: UpdateAddressDto) {
    await this.findMine(id, userId);
    return this.prisma.address.update({ where: { id }, data: dto });
  }

  // Основной адрес у пользователя ровно один: снимаем флаг с остальных в той же транзакции
  async makeDefault(id: number, userId: number) {
    await this.findMine(id, userId);
    await this.prisma.$transaction([
      this.prisma.address.updateMany({
        where: { userId, id: { not: id } },
        data: { isDefault: false },
      }),
      this.prisma.address.update({ where: { id }, data: { isDefault: true } }),
    ]);
    return this.findAll(userId);
  }

  async remove(id: number, userId: number) {
    const address = await this.findMine(id, userId);
    await this.prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id } });
      if (!address.isDefault) return;
      // Удалили основной — основным становится самый старый из оставшихся
      const next = await tx.address.findFirst({
        where: { userId },
        orderBy: { id: 'asc' },
      });
      if (next)
        await tx.address.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
    });
  }

  // Чужой адрес → 404, а не 403: не раскрываем, что такой id существует
  private async findMine(id: number, userId: number) {
    const address = await this.prisma.address.findFirst({
      where: { id, userId },
    });
    if (!address) throw new NotFoundException(`Адрес ${id} не найден`);
    return address;
  }
}
