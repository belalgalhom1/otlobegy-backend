import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { StorageService } from '../../../infrastructure/storage/storage.service';
import {
  CreateMenuCategoryDto,
  UpdateMenuCategoryDto,
  ReorderCategoriesDto,
} from './dto/menu-category.dto';
import {
  CommonSuccess,
  VendorErrors,
} from '../../../common/constants/response.constants';

export const MenuCategoryErrors = {
  NOT_FOUND: 'menu_category.error.not_found',
  BELONGS_TO_OTHER_VENDOR: 'menu_category.error.belongs_to_other_vendor',
};

@Injectable()
export class MenuCategoriesService {
  private readonly logger = new Logger(MenuCategoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ─── List all categories for a vendor ─────────────────────────────────────
  // Public — customers browse menus, so active-only filtering is available.

  async findAll(vendorId: string, activeOnly = false) {
    await this.assertVendorExists(vendorId);

    const where: Prisma.MenuCategoryWhereInput = { vendorId };
    if (activeOnly) where.isActive = true;

    return this.prisma.menuCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
    });
  }

  // ─── Get single category ───────────────────────────────────────────────────

  async findOne(vendorId: string, categoryId: string) {
    await this.assertVendorExists(vendorId);

    const category = await this.prisma.menuCategory.findFirst({
      where: { id: categoryId, vendorId },
      include: {
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
    });

    if (!category) throw new NotFoundException(MenuCategoryErrors.NOT_FOUND);
    return category;
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(vendorId: string, dto: CreateMenuCategoryDto) {
    await this.assertVendorExists(vendorId);

    // Auto-assign sortOrder to end of list if not provided
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const last = await this.prisma.menuCategory.aggregate({
        where: { vendorId },
        _max: { sortOrder: true },
      });
      sortOrder = (last._max.sortOrder ?? -1) + 1;
    }

    const category = await this.prisma.menuCategory.create({
      data: {
        vendorId,
        name: dto.name,
        nameAr: dto.nameAr ?? null,
        description: dto.description ?? null,
        descriptionAr: dto.descriptionAr ?? null,
        sortOrder,
        isActive: dto.isActive ?? true,
      },
      include: {
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
    });

    return category;
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(
    vendorId: string,
    categoryId: string,
    dto: UpdateMenuCategoryDto,
  ) {
    await this.findOne(vendorId, categoryId); // 404 if not found

    const updated = await this.prisma.menuCategory.update({
      where: { id: categoryId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.nameAr !== undefined && { nameAr: dto.nameAr }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.descriptionAr !== undefined && {
          descriptionAr: dto.descriptionAr,
        }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
    });

    this.logger.log(`Menu category updated: ${categoryId}`);
    return updated;
  }

  // ─── Bulk reorder ─────────────────────────────────────────────────────────
  // Accepts an array of { id, sortOrder } — updates all in a transaction.

  async reorder(vendorId: string, dto: ReorderCategoriesDto) {
    await this.assertVendorExists(vendorId);

    // Verify all IDs belong to this vendor
    const ids = dto.items.map((i) => i.id);
    const categories = await this.prisma.menuCategory.findMany({
      where: { id: { in: ids }, vendorId },
      select: { id: true },
    });

    if (categories.length !== ids.length) {
      throw new ForbiddenException(MenuCategoryErrors.BELONGS_TO_OTHER_VENDOR);
    }

    await this.prisma.$transaction(
      dto.items.map(({ id, sortOrder }) =>
        this.prisma.menuCategory.update({
          where: { id },
          data: { sortOrder },
        }),
      ),
    );

    this.logger.log(
      `Reordered ${ids.length} categories for vendor ${vendorId}`,
    );
    return { message: CommonSuccess.OPERATION_SUCCESS };
  }

  // ─── Delete ───────────────────────────────────────────────────────────────
  // Products whose category is deleted get categoryId set to null (onDelete: SetNull in schema).

  async remove(vendorId: string, categoryId: string) {
    await this.findOne(vendorId, categoryId);

    await this.prisma.menuCategory.delete({ where: { id: categoryId } });

    return { message: CommonSuccess.RESOURCE_DELETED };
  }

  // ─── Upload Icon ──────────────────────────────────────────────────────────

  async uploadIcon(
    vendorId: string,
    categoryId: string,
    file: Express.Multer.File,
  ) {
    const category = await this.findOne(vendorId, categoryId);

    if (category.iconUrl) {
      await this.storage.delete(category.iconUrl);
    }

    const iconUrl = await this.storage.upload(file, 'vendors/categories/icons');
    this.logger.log(`Icon uploaded for category ${categoryId}: ${iconUrl}`);

    await this.prisma.menuCategory.update({
      where: { id: categoryId },
      data: { iconUrl },
    });

    return { iconUrl };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async assertVendorExists(vendorId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, deletedAt: null },
      select: { id: true },
    });
    if (!vendor) throw new NotFoundException(VendorErrors.NOT_FOUND);
  }
}
