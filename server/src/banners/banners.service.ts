import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ShopGateway } from '../realtime/shop.gateway.js';
import { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto.js';

@Injectable()
export class BannersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ShopGateway,
  ) {}

  // Витрина: включённые и попадающие в период показа
  findVisible() {
    const now = new Date();
    return this.prisma.banner.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        ],
      },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
  }

  findAll() {
    return this.prisma.banner.findMany({
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
  }

  async findOne(id: number) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException(`Баннер ${id} не найден`);
    return banner;
  }

  async create(dto: CreateBannerDto) {
    checkPeriod(dto.startsAt, dto.endsAt);
    // Новый баннер — в конец карусели
    const last = await this.prisma.banner.aggregate({
      _max: { position: true },
    });
    const banner = await this.prisma.banner.create({
      data: { ...dto, position: (last._max.position ?? -1) + 1 },
    });
    this.gateway.bannersChanged();
    return banner;
  }

  async update(id: number, dto: UpdateBannerDto) {
    const current = await this.findOne(id);
    // Период проверяем вместе с тем, что уже сохранено: могли прислать только одну из дат
    checkPeriod(
      dto.startsAt === undefined ? current.startsAt : dto.startsAt,
      dto.endsAt === undefined ? current.endsAt : dto.endsAt,
    );
    const banner = await this.prisma.banner.update({
      where: { id },
      data: dto,
    });
    this.gateway.bannersChanged();
    return banner;
  }

  async remove(id: number) {
    const { count } = await this.prisma.banner.deleteMany({ where: { id } });
    if (count === 0) throw new NotFoundException(`Баннер ${id} не найден`);
    this.gateway.bannersChanged();
  }

  // Позиция = индекс в присланном списке. Баннеры, которых нет в списке, не трогаем
  async reorder(ids: number[]) {
    await this.prisma.$transaction(
      ids.map((id, position) =>
        this.prisma.banner.updateMany({ where: { id }, data: { position } }),
      ),
    );
    this.gateway.bannersChanged();
    return this.findAll();
  }
}

function checkPeriod(
  startsAt?: string | Date | null,
  endsAt?: string | Date | null,
) {
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    throw new BadRequestException(
      'Дата окончания показа должна быть позже даты начала',
    );
  }
}
