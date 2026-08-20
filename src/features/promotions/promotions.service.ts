import { Injectable, NotFoundException, Logger } from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { PromotionErrors } from 'src/common/constants/response.constants';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotions.dto';

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.promotion.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        vendor: {
          select: { id: true, storeName: true, storeNameAr: true },
        },
        product: {
          select: { id: true, name: true, nameAr: true },
        },
      },
    });
  }

  async findAllActive() {
    const now = new Date();
    return this.prisma.promotion.findMany({
      where: {
        isActive: true,
        OR: [{ startDate: null }, { startDate: { lte: now } }],
        AND: [
          {
            OR: [{ endDate: null }, { endDate: { gte: now } }],
          },
        ],
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
      include: {
        vendor: true,
        product: true,
      },
    });
    if (!promotion) throw new NotFoundException(PromotionErrors.NOT_FOUND);
    return promotion;
  }

  async create(dto: CreatePromotionDto) {
    return this.prisma.promotion.create({
      data: {
        ...dto,
        title: dto.title ?? '',
        imageUrl: '', // Will be updated after upload
      },
    });
  }

  async update(id: string, dto: UpdatePromotionDto) {
    return this.prisma.promotion.update({
      where: { id },
      data: dto,
    });
  }

  async updateImage(id: string, imageUrl: string) {
    return this.prisma.promotion.update({
      where: { id },
      data: { imageUrl },
    });
  }

  async remove(id: string) {
    return this.prisma.promotion.delete({ where: { id } });
  }
}
