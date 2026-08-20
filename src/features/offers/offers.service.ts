import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  CreateOfferDto,
  UpdateOfferDto,
} from '../promotions/dto/promotions.dto';

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(private prisma: PrismaService) {}

  async findAllActive() {
    const now = new Date();
    return this.prisma.offer.findMany({
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
      include: {
        vendor: {
          select: { id: true, storeName: true, storeNameAr: true },
        },
        product: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            imageUrl: true,
            basePrice: true,
            comparePrice: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.offer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: { select: { storeName: true } },
        product: { select: { name: true } },
      },
    });
  }

  async create(dto: CreateOfferDto) {
    return this.prisma.offer.create({
      data: {
        productId: dto.productId,
        vendorId: dto.vendorId,
        originalPrice: dto.originalPrice,
        offerPrice: dto.offerPrice,
        sortOrder: dto.sortOrder,
        startDate: dto.startDate,
        endDate: dto.endDate,
      },
    });
  }

  async update(id: string, dto: UpdateOfferDto) {
    return this.prisma.offer.update({
      where: { id },
      data: {
        originalPrice: dto.originalPrice,
        offerPrice: dto.offerPrice,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
        startDate: dto.startDate,
        endDate: dto.endDate,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.offer.delete({ where: { id } });
  }
}
