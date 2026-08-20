import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { StorageService } from 'src/infrastructure/storage/storage.service';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import {
  CreateVendorVerticalDto,
  UpdateVendorVerticalDto,
} from './dto/vendor-vertical.dto';
import {
  VendorVerticalErrors,
  CommonSuccess,
} from 'src/common/constants/response.constants';

@Injectable()
export class VendorVerticalsService {
  private readonly logger = new Logger(VendorVerticalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(dto: CreateVendorVerticalDto) {
    await this.assertSlugAvailable(dto.slug);

    return this.prisma.vendorVertical.create({
      data: {
        name: dto.name,
        nameAr: dto.nameAr ?? null,
        slug: dto.slug,
        iconUrl: dto.iconUrl ?? null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async findAll() {
    return this.prisma.vendorVertical.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findAllActive() {
    return this.prisma.vendorVertical.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const vertical = await this.prisma.vendorVertical.findUnique({
      where: { id },
    });
    if (!vertical) throw new NotFoundException(VendorVerticalErrors.NOT_FOUND);
    return vertical;
  }

  async update(id: string, dto: UpdateVendorVerticalDto) {
    await this.findOne(id);

    if (dto.slug) {
      await this.assertSlugAvailable(dto.slug, id);
    }

    return this.prisma.vendorVertical.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.nameAr !== undefined && { nameAr: dto.nameAr }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.iconUrl !== undefined && { iconUrl: dto.iconUrl }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const activeVendorsCount = await this.prisma.vendor.count({
      where: { verticalId: id, deletedAt: null },
    });

    if (activeVendorsCount > 0) {
      throw new ConflictException(
        `Cannot delete this business type because it is currently used by ${activeVendorsCount} active vendor(s). Please reassign them first.`,
      );
    }

    await this.prisma.vendor.deleteMany({
      where: { verticalId: id, deletedAt: { not: null } },
    });

    await this.prisma.vendorVertical.delete({ where: { id } });
    return { message: CommonSuccess.RESOURCE_DELETED };
  }

  async uploadIcon(id: string, file: Express.Multer.File) {
    const vertical = await this.findOne(id);

    if (vertical.iconUrl) {
      // Optional: you could delete the old icon here
      // await this.storage.delete(vertical.iconUrl);
    }

    const iconUrl = await this.storage.upload(file, 'verticals/icons');

    await this.prisma.vendorVertical.update({
      where: { id },
      data: { iconUrl },
    });

    return { iconUrl };
  }

  private async assertSlugAvailable(slug: string, excludeId?: string) {
    const existing = await this.prisma.vendorVertical.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing && existing.id !== excludeId) {
      throw new ConflictException(VendorVerticalErrors.SLUG_TAKEN);
    }
  }
}
