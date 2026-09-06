import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { StorageService } from '../../../infrastructure/storage/storage.service';
import { Prisma } from '@prisma/client';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateProductVariantDto,
  UpdateProductVariantDto,
  CreateOptionGroupDto,
  UpdateOptionGroupDto,
  CreateProductOptionDto,
  UpdateProductOptionDto,
  QueryProductsDto,
} from './dto/product.dto';
import {
  CommonSuccess,
  VendorErrors,
  ProductErrors,
} from '../../../common/constants/response.constants';

// Detail include for single product fetch
const PRODUCT_DETAIL_INCLUDE = {
  category: { select: { id: true, name: true, nameAr: true } },
  variants: {
    where: { isActive: true },
    orderBy: { name: 'asc' as const },
    include: {
      optionGroups: {
        include: {
          options: {
            where: { isActive: true },
            orderBy: { name: 'asc' as const },
          },
        },
      },
    },
  },
  optionGroups: {
    include: {
      options: { where: { isActive: true }, orderBy: { name: 'asc' as const } },
    },
  },
  _count: { select: { favoritedBy: true } },
};

// Lightweight list include to prevent N+1 query payload bloat
const PRODUCT_LIST_INCLUDE = {
  category: { select: { id: true, name: true, nameAr: true } },
  variants: {
    where: { isActive: true },
    orderBy: { name: 'asc' as const },
    select: {
      id: true,
      name: true,
      nameAr: true,
      basePrice: true,
      comparePrice: true,
      stock: true,
    },
  },
  _count: { select: { favoritedBy: true } },
};

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async onModuleInit() {
    // Sanitize any existing empty string SKUs to NULL so they do not collide with unique constraints
    try {
      await this.prisma.product.updateMany({
        where: { sku: '' },
        data: { sku: null },
      });
      await this.prisma.productVariant.updateMany({
        where: { sku: '' },
        data: { sku: null },
      });
    } catch (err) {
      this.logger.warn(`Failed to sanitize empty string SKUs on startup: ${err}`);
    }
  }

  // ─── List products ────────────────────────────────────────────────────────

  async findAll(vendorId: string, dto: QueryProductsDto) {
    await this.assertVendorExists(vendorId);

    const { page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = { vendorId, deletedAt: null };

    if (dto.categoryId !== undefined) where.categoryId = dto.categoryId;
    if (dto.isActive !== undefined) where.isActive = dto.isActive;
    if (dto.isFeatured !== undefined) where.isFeatured = dto.isFeatured;
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { nameAr: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: PRODUCT_LIST_INCLUDE,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── Get single product ───────────────────────────────────────────────────

  async findOne(vendorId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, vendorId, deletedAt: null },
      include: PRODUCT_DETAIL_INCLUDE,
    });

    if (!product) throw new NotFoundException(ProductErrors.NOT_FOUND);
    return product;
  }

  // ─── Get single product by id (no vendor scope — for cart/order use) ──────

  async findById(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      include: PRODUCT_DETAIL_INCLUDE,
    });
    if (!product) throw new NotFoundException(ProductErrors.NOT_FOUND);
    return product;
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(vendorId: string, dto: CreateProductDto) {
    await this.assertVendorExists(vendorId);

    // Validate: simple product needs basePrice
    if (!dto.hasVariants && !dto.basePrice) {
      throw new BadRequestException(ProductErrors.PRICE_REQUIRED);
    }

    if (dto.categoryId) {
      await this.assertCategoryBelongsToVendor(dto.categoryId, vendorId);
    }

    const sku = dto.sku?.trim() ? dto.sku.trim() : null;
    if (sku) {
      await this.assertSkuAvailable(sku);
    }

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          vendorId,
          categoryId: dto.categoryId ?? null,
          name: dto.name,
          nameAr: dto.nameAr ?? null,
          description: dto.description ?? null,
          descriptionAr: dto.descriptionAr ?? null,
          hasVariants: dto.hasVariants ?? false,
          basePrice: dto.basePrice ?? null,
          comparePrice: dto.comparePrice ?? null,
          sku,
          stock: dto.stock ?? null,
          isActive: dto.isActive ?? true,
          isFeatured: dto.isFeatured ?? false,
          sellByStrip: dto.sellByStrip ?? false,
          stripsPerPackage: dto.stripsPerPackage ?? null,
        },
      });

      // Create option groups + options for simple products
      if (!dto.hasVariants && dto.optionGroups?.length) {
        await this.createOptionGroups(tx, created.id, null, dto.optionGroups);
      }

      // Create variants + their option groups
      if (dto.hasVariants && dto.variants?.length) {
        for (const variantDto of dto.variants) {
          await this.createVariantWithOptions(tx, created.id, variantDto);
        }
      }

      return created;
    });

    this.logger.log(`Product created: ${product.id} for vendor ${vendorId}`);
    return this.findOne(vendorId, product.id);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(vendorId: string, productId: string, dto: UpdateProductDto) {
    const exists = await this.prisma.product.findFirst({
      where: { id: productId, vendorId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(ProductErrors.NOT_FOUND);

    if (dto.categoryId !== undefined && dto.categoryId !== null) {
      await this.assertCategoryBelongsToVendor(dto.categoryId, vendorId);
    }

    const sku =
      dto.sku !== undefined
        ? dto.sku?.trim()
          ? dto.sku.trim()
          : null
        : undefined;

    if (sku) {
      await this.assertSkuAvailable(sku, productId);
    }

    try {
      await this.prisma.product.update({
        where: {
          id: productId,
          ...(dto.version !== undefined && { version: dto.version }),
        },
        data: {
          ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.nameAr !== undefined && { nameAr: dto.nameAr }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.descriptionAr !== undefined && {
            descriptionAr: dto.descriptionAr,
          }),
          ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
          ...(dto.comparePrice !== undefined && {
            comparePrice: dto.comparePrice,
          }),
          ...(sku !== undefined && { sku }),
          ...(dto.stock !== undefined && { stock: dto.stock }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
          ...(dto.sellByStrip !== undefined && {
            sellByStrip: dto.sellByStrip,
          }),
          ...(dto.stripsPerPackage !== undefined && {
            stripsPerPackage: dto.stripsPerPackage,
          }),
          version: { increment: 1 },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException(
          'Product has been updated by another request. Please reload and try again.',
        );
      }
      throw error;
    }

    return this.findOne(vendorId, productId);
  }

  // ─── Upload product image ─────────────────────────────────────────────────

  async uploadImage(
    vendorId: string,
    productId: string,
    file: Express.Multer.File,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, vendorId, deletedAt: null },
      select: { imageUrl: true },
    });
    if (!product) throw new NotFoundException(ProductErrors.NOT_FOUND);

    if (product.imageUrl) {
      await this.storage.delete(product.imageUrl);
    }

    const imageUrl = await this.storage.upload(file, 'products/images');

    await this.prisma.product.update({
      where: { id: productId },
      data: { imageUrl },
    });

    this.logger.log(`Image uploaded for product ${productId}: ${imageUrl}`);
    return { imageUrl };
  }

  // ─── Soft delete ──────────────────────────────────────────────────────────

  async remove(vendorId: string, productId: string) {
    const exists = await this.prisma.product.findFirst({
      where: { id: productId, vendorId, deletedAt: null },
      select: { id: true, sku: true },
    });
    if (!exists) throw new NotFoundException(ProductErrors.NOT_FOUND);

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        deletedAt: new Date(),
        isActive: false,
        sku: exists.sku ? `${exists.sku}#deleted#${Date.now()}` : null,
      },
    });

    this.logger.log(`Product soft-deleted: ${productId}`);
    return { message: CommonSuccess.RESOURCE_DELETED };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VARIANTS
  // ═══════════════════════════════════════════════════════════════════════════

  async addVariant(
    vendorId: string,
    productId: string,
    dto: CreateProductVariantDto,
  ) {
    const product = await this.findOne(vendorId, productId);

    // Automatically set hasVariants to true if this is the first variant
    if (!product.hasVariants) {
      await this.prisma.product.update({
        where: { id: productId },
        data: { hasVariants: true },
      });
    }

    const sku = dto.sku?.trim() ? dto.sku.trim() : null;
    if (sku) {
      await this.assertVariantSkuAvailable(sku);
    }

    const variant = await this.prisma.$transaction(async (tx) => {
      const created = await tx.productVariant.create({
        data: {
          productId,
          name: dto.name,
          nameAr: dto.nameAr ?? null,
          sku,
          basePrice: dto.basePrice,
          comparePrice: dto.comparePrice ?? null,
          stock: dto.stock ?? null,
          isActive: dto.isActive ?? true,
        },
      });

      if (dto.optionGroups?.length) {
        await this.createOptionGroups(tx, null, created.id, dto.optionGroups);
      }

      return created;
    });

    this.logger.log(`Variant ${variant.id} added to product ${productId}`);
    return this.findOne(vendorId, productId);
  }

  async updateVariant(
    vendorId: string,
    productId: string,
    variantId: string,
    dto: UpdateProductVariantDto,
  ) {
    await this.assertVariantBelongsToProduct(variantId, productId, vendorId);

    const sku =
      dto.sku !== undefined
        ? dto.sku?.trim()
          ? dto.sku.trim()
          : null
        : undefined;

    if (sku) {
      await this.assertVariantSkuAvailable(sku, variantId);
    }

    try {
      await this.prisma.productVariant.update({
        where: {
          id: variantId,
          ...(dto.version !== undefined && { version: dto.version }),
        },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.nameAr !== undefined && { nameAr: dto.nameAr }),
          ...(sku !== undefined && { sku }),
          ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
          ...(dto.comparePrice !== undefined && {
            comparePrice: dto.comparePrice,
          }),
          ...(dto.stock !== undefined && { stock: dto.stock }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          version: { increment: 1 },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException(
          'Variant has been updated by another request. Please reload and try again.',
        );
      }
      throw error;
    }

    return this.findOne(vendorId, productId);
  }

  async removeVariant(vendorId: string, productId: string, variantId: string) {
    await this.assertVariantBelongsToProduct(variantId, productId, vendorId);

    await this.prisma.productVariant.delete({ where: { id: variantId } });

    this.logger.log(`Variant ${variantId} deleted from product ${productId}`);
    return this.findOne(vendorId, productId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OPTION GROUPS
  // ═══════════════════════════════════════════════════════════════════════════

  async addOptionGroup(
    vendorId: string,
    productId: string,
    dto: CreateOptionGroupDto,
    variantId?: string,
  ) {
    await this.assertVendorProductScope(vendorId, productId, variantId);

    const group = await this.prisma.$transaction(async (tx) => {
      const created = await tx.productOptionGroup.create({
        data: {
          productId: variantId ? null : productId,
          variantId: variantId ?? null,
          name: dto.name,
          nameAr: dto.nameAr ?? null,
          isRequired: dto.isRequired ?? false,
          minSelect: dto.minSelect ?? 0,
          maxSelect: dto.maxSelect ?? 1,
        },
      });

      if (dto.options?.length) {
        await tx.productOption.createMany({
          data: dto.options.map((o) => ({
            groupId: created.id,
            name: o.name,
            nameAr: o.nameAr ?? null,
            priceAdded: o.priceAdded ?? 0,
            isActive: o.isActive ?? true,
          })),
        });
      }

      return created;
    });

    this.logger.log(`Option group ${group.id} added to product ${productId}`);
    return this.findOne(vendorId, productId);
  }

  async updateOptionGroup(
    vendorId: string,
    productId: string,
    groupId: string,
    dto: UpdateOptionGroupDto,
  ) {
    await this.assertGroupBelongsToProduct(groupId, productId, vendorId);

    await this.prisma.productOptionGroup.update({
      where: { id: groupId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.nameAr !== undefined && { nameAr: dto.nameAr }),
        ...(dto.isRequired !== undefined && { isRequired: dto.isRequired }),
        ...(dto.minSelect !== undefined && { minSelect: dto.minSelect }),
        ...(dto.maxSelect !== undefined && { maxSelect: dto.maxSelect }),
      },
    });

    return this.findOne(vendorId, productId);
  }

  async removeOptionGroup(
    vendorId: string,
    productId: string,
    groupId: string,
  ) {
    await this.assertGroupBelongsToProduct(groupId, productId, vendorId);
    await this.prisma.productOptionGroup.delete({ where: { id: groupId } });
    return this.findOne(vendorId, productId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async addOption(
    vendorId: string,
    productId: string,
    groupId: string,
    dto: CreateProductOptionDto,
  ) {
    await this.assertGroupBelongsToProduct(groupId, productId, vendorId);

    const option = await this.prisma.productOption.create({
      data: {
        groupId,
        name: dto.name,
        nameAr: dto.nameAr ?? null,
        priceAdded: dto.priceAdded ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    return this.findOne(vendorId, productId);
  }

  async updateOption(
    vendorId: string,
    productId: string,
    groupId: string,
    optionId: string,
    dto: UpdateProductOptionDto,
  ) {
    await this.assertGroupBelongsToProduct(groupId, productId, vendorId);
    await this.assertOptionBelongsToGroup(optionId, groupId);

    await this.prisma.productOption.update({
      where: { id: optionId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.nameAr !== undefined && { nameAr: dto.nameAr }),
        ...(dto.priceAdded !== undefined && { priceAdded: dto.priceAdded }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return this.findOne(vendorId, productId);
  }

  async removeOption(
    vendorId: string,
    productId: string,
    groupId: string,
    optionId: string,
  ) {
    await this.assertGroupBelongsToProduct(groupId, productId, vendorId);
    await this.assertOptionBelongsToGroup(optionId, groupId);
    await this.prisma.productOption.delete({ where: { id: optionId } });
    return this.findOne(vendorId, productId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async createOptionGroups(
    tx: Prisma.TransactionClient,
    productId: string | null,
    variantId: string | null,
    groups: CreateOptionGroupDto[],
  ) {
    for (const g of groups) {
      const group = await tx.productOptionGroup.create({
        data: {
          productId,
          variantId,
          name: g.name,
          nameAr: g.nameAr ?? null,
          isRequired: g.isRequired ?? false,
          minSelect: g.minSelect ?? 0,
          maxSelect: g.maxSelect ?? 1,
        },
      });

      if (g.options?.length) {
        await tx.productOption.createMany({
          data: g.options.map((o) => ({
            groupId: group.id,
            name: o.name,
            nameAr: o.nameAr ?? null,
            priceAdded: o.priceAdded ?? 0,
            isActive: o.isActive ?? true,
          })),
        });
      }
    }
  }

  private async createVariantWithOptions(
    tx: Prisma.TransactionClient,
    productId: string,
    dto: CreateProductVariantDto,
  ) {
    const sku = dto.sku?.trim() ? dto.sku.trim() : null;
    if (sku) {
      await this.assertVariantSkuAvailable(sku);
    }

    const variant = await tx.productVariant.create({
      data: {
        productId,
        name: dto.name,
        nameAr: dto.nameAr ?? null,
        sku,
        basePrice: dto.basePrice,
        comparePrice: dto.comparePrice ?? null,
        stock: dto.stock ?? null,
        isActive: dto.isActive ?? true,
      },
    });

    if (dto.optionGroups?.length) {
      await this.createOptionGroups(tx, null, variant.id, dto.optionGroups);
    }
  }

  private async assertVendorExists(vendorId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, deletedAt: null },
      select: { id: true },
    });
    if (!vendor) throw new NotFoundException(VendorErrors.NOT_FOUND);
  }

  private async assertCategoryBelongsToVendor(
    categoryId: string,
    vendorId: string,
  ) {
    const cat = await this.prisma.menuCategory.findFirst({
      where: { id: categoryId, vendorId },
      select: { id: true },
    });
    if (!cat) throw new NotFoundException(ProductErrors.CATEGORY_NOT_FOUND);
  }

  private async assertSkuAvailable(sku: string, excludeId?: string) {
    const existing = await this.prisma.product.findFirst({
      where: { sku },
      select: { id: true },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(ProductErrors.SKU_TAKEN);
    }
  }

  private async assertVariantSkuAvailable(sku: string, excludeId?: string) {
    const existing = await this.prisma.productVariant.findUnique({
      where: { sku },
      select: { id: true },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(ProductErrors.SKU_TAKEN);
    }
  }

  private async assertVariantBelongsToProduct(
    variantId: string,
    productId: string,
    vendorId: string,
  ) {
    // Also validate vendor scope via product
    const product = await this.prisma.product.findFirst({
      where: { id: productId, vendorId, deletedAt: null },
      select: { id: true },
    });
    if (!product) throw new NotFoundException(ProductErrors.NOT_FOUND);

    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      select: { id: true },
    });
    if (!variant) throw new NotFoundException(ProductErrors.VARIANT_NOT_FOUND);
  }

  private async assertVendorProductScope(
    vendorId: string,
    productId: string,
    variantId?: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, vendorId, deletedAt: null },
      select: { id: true },
    });
    if (!product) throw new NotFoundException(ProductErrors.NOT_FOUND);

    if (variantId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { id: variantId, productId },
        select: { id: true },
      });
      if (!variant)
        throw new NotFoundException(ProductErrors.VARIANT_NOT_FOUND);
    }
  }

  private async assertGroupBelongsToProduct(
    groupId: string,
    productId: string,
    vendorId: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, vendorId, deletedAt: null },
      select: { id: true },
    });
    if (!product) throw new NotFoundException(ProductErrors.NOT_FOUND);

    const group = await this.prisma.productOptionGroup.findFirst({
      where: {
        id: groupId,
        OR: [{ productId }, { variant: { productId } }],
      },
      select: { id: true },
    });
    if (!group)
      throw new NotFoundException(ProductErrors.OPTION_GROUP_NOT_FOUND);
  }

  private async assertOptionBelongsToGroup(optionId: string, groupId: string) {
    const option = await this.prisma.productOption.findFirst({
      where: { id: optionId, groupId },
      select: { id: true },
    });
    if (!option) throw new NotFoundException(ProductErrors.OPTION_NOT_FOUND);
  }
}
