import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  CreateAddressDto,
  UpdateAddressDto,
  QueryCustomersDto,
  QueryCustomerOrdersDto,
} from './dto/customer.dto';
import {
  CustomerErrors,
  CommonSuccess,
} from 'src/common/constants/response.constants';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARED HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  async getCustomerByUserId(userId: string) {
    return this.prisma.customer.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async assertCanOrder(userId: string) {
    const customer = await this.getCustomerByUserId(userId);

    if (!customer.canOrder) {
      throw new ForbiddenException(CustomerErrors.CANNOT_ORDER);
    }

    return customer;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SELF-SERVICE (existing — unchanged)
  // ═══════════════════════════════════════════════════════════════════════════

  async getAddresses(userId: string) {
    const customer = await this.getCustomerByUserId(userId);

    return this.prisma.$queryRaw`
      SELECT 
        id, 
        label, 
        address, 
        details, 
        "isDefault", 
        ST_AsGeoJSON(location)::json as location, 
        "createdAt", 
        "updatedAt"
      FROM addresses
      WHERE "customerId" = ${customer.id}
      ORDER BY "createdAt" DESC;
    `;
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    const customer = await this.getCustomerByUserId(userId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { customerId: customer.id },
          data: { isDefault: false },
        });
      }

      const [address] = await tx.$queryRaw<any[]>`
        INSERT INTO addresses (id, "customerId", label, address, details, "isDefault", location, "updatedAt")
        VALUES (
          gen_random_uuid(), 
          ${customer.id}, 
          ${dto.label ?? 'Home'}, 
          ${dto.address}, 
          ${dto.details ?? null}, 
          ${dto.isDefault ?? false}, 
          ST_SetSRID(ST_MakePoint(${dto.location[0]}, ${dto.location[1]}), 4326),
          NOW()
        )
        RETURNING id, label, address, details, "isDefault", ST_AsGeoJSON(location)::json as location;
      `;

      return address;
    });
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ) {
    const customer = await this.getCustomerByUserId(userId);

    const address = await this.prisma.address.findFirst({
      where: { id: addressId, customerId: customer.id },
    });

    if (!address) throw new NotFoundException(CustomerErrors.ADDRESS_NOT_FOUND);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { customerId: customer.id, id: { not: addressId } },
          data: { isDefault: false },
        });
      }

      const locationUpdate = dto.location
        ? Prisma.sql`ST_SetSRID(ST_MakePoint(${dto.location[0]}, ${dto.location[1]}), 4326)`
        : Prisma.sql`location`;

      const [updated] = await tx.$queryRaw<any[]>`
        UPDATE addresses 
        SET 
          label = COALESCE(${dto.label ?? null}, label),
          address = COALESCE(${dto.address ?? null}, address),
          details = COALESCE(${dto.details ?? null}, details),
          "isDefault" = COALESCE(${dto.isDefault ?? null}, "isDefault"),
          location = ${locationUpdate},
          "updatedAt" = NOW()
        WHERE id = ${addressId} AND "customerId" = ${customer.id}
        RETURNING id, label, address, details, "isDefault", ST_AsGeoJSON(location)::json as location;
      `;

      return updated;
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const customer = await this.getCustomerByUserId(userId);

    const result = await this.prisma.address.deleteMany({
      where: { id: addressId, customerId: customer.id },
    });

    if (result.count === 0)
      throw new NotFoundException(CustomerErrors.ADDRESS_NOT_FOUND);
    return { success: true };
  }

  async toggleFavoriteVendor(userId: string, vendorId: string) {
    const customer = await this.getCustomerByUserId(userId);

    const existing = await this.prisma.favoriteVendor.findUnique({
      where: { customerId_vendorId: { customerId: customer.id, vendorId } },
    });

    if (existing) {
      await this.prisma.favoriteVendor.delete({ where: { id: existing.id } });
      return { isFavorite: false };
    }

    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });
    if (!vendor)
      throw new NotFoundException(CustomerErrors.FAVORITE_VENDOR_NOT_FOUND);

    await this.prisma.favoriteVendor.create({
      data: { customerId: customer.id, vendorId },
    });
    return { isFavorite: true };
  }

  async toggleFavoriteProduct(userId: string, productId: string) {
    const customer = await this.getCustomerByUserId(userId);

    const existing = await this.prisma.favoriteProduct.findUnique({
      where: { customerId_productId: { customerId: customer.id, productId } },
    });

    if (existing) {
      await this.prisma.favoriteProduct.delete({ where: { id: existing.id } });
      return { isFavorite: false };
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product)
      throw new NotFoundException(CustomerErrors.FAVORITE_PRODUCT_NOT_FOUND);

    await this.prisma.favoriteProduct.create({
      data: { customerId: customer.id, productId },
    });
    return { isFavorite: true };
  }

  async getFavorites(userId: string) {
    const customer = await this.getCustomerByUserId(userId);

    const [vendors, products] = await Promise.all([
      this.prisma.favoriteVendor.findMany({
        where: { customerId: customer.id },
        include: {
          vendor: { select: { id: true, storeName: true, logo: true } },
        },
      }),
      this.prisma.favoriteProduct.findMany({
        where: { customerId: customer.id },
        include: {
          product: {
            select: { id: true, name: true, imageUrl: true, basePrice: true },
          },
        },
      }),
    ]);

    return {
      vendors: vendors.map((v) => v.vendor),
      products: products.map((p) => p.product),
    };
  }

  async getCoinHistory(userId: string, page = 1, limit = 20) {
    const customer = await this.getCustomerByUserId(userId);
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.customerCoinTransaction.findMany({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.customerCoinTransaction.count({
        where: { customerId: customer.id },
      }),
    ]);

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      currentBalance: customer.coinBalance,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN — Customer Management  (MANAGE_CUSTOMERS, enforced at route level)
  // ═══════════════════════════════════════════════════════════════════════════

  async adminFindAll(dto: QueryCustomersDto) {
    const { page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};

    if (!dto.includeDeleted) where.deletedAt = null;
    if (dto.canOrder !== undefined) where.canOrder = dto.canOrder;
    if (dto.search) {
      where.user = {
        OR: [
          { name: { contains: dto.search, mode: 'insensitive' } },
          { email: { contains: dto.search, mode: 'insensitive' } },
          { phone: { contains: dto.search, mode: 'insensitive' } },
        ],
      };
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              isBanned: true,
              isEmailVerified: true,
              createdAt: true,
            },
          },
          _count: { select: { orders: true, addresses: true } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async adminFindOne(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            language: true,
            isBanned: true,
            banReason: true,
            isEmailVerified: true,
            isPhoneVerified: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            orders: true,
            addresses: true,
            favoriteVendors: true,
            favoriteProducts: true,
          },
        },
      },
    });

    if (!customer)
      throw new NotFoundException(CustomerErrors.CUSTOMER_NOT_FOUND);

    // Last 5 orders for quick overview panel
    const recentOrders = await this.prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        grandTotal: true,
        paymentMethod: true,
        createdAt: true,
        vendor: { select: { id: true, storeName: true } },
      },
    });

    return { ...customer, recentOrders };
  }

  async adminFindByUserId(userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            isBanned: true,
            isEmailVerified: true,
            createdAt: true,
          },
        },
        _count: { select: { orders: true, addresses: true } },
      },
    });

    if (!customer)
      throw new NotFoundException(CustomerErrors.CUSTOMER_NOT_FOUND);
    return customer;
  }

  async adminSetCanOrder(customerId: string, canOrder: boolean) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });
    if (!customer)
      throw new NotFoundException(CustomerErrors.CUSTOMER_NOT_FOUND);

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: { canOrder },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(
      `Admin set canOrder=${canOrder} for customer ${customerId}`,
    );
    return updated;
  }

  async adminGetAddresses(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });
    if (!customer)
      throw new NotFoundException(CustomerErrors.CUSTOMER_NOT_FOUND);

    return this.prisma.$queryRaw`
      SELECT
        id,
        label,
        address,
        details,
        "isDefault",
        ST_AsGeoJSON(location)::json AS location,
        "createdAt",
        "updatedAt"
      FROM addresses
      WHERE "customerId" = ${customerId}
      ORDER BY "isDefault" DESC, "createdAt" DESC
    `;
  }

  async adminGetOrders(customerId: string, dto: QueryCustomerOrdersDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });
    if (!customer)
      throw new NotFoundException(CustomerErrors.CUSTOMER_NOT_FOUND);

    const { page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
          subtotal: true,
          deliveryFee: true,
          grandTotal: true,
          createdAt: true,
          actualDeliveryTime: true,
          vendor: { select: { id: true, storeName: true, logo: true } },
          driver: { select: { id: true, name: true } },
        },
      }),
      this.prisma.order.count({ where: { customerId } }),
    ]);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async adminRemove(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });
    if (!customer)
      throw new NotFoundException(CustomerErrors.CUSTOMER_NOT_FOUND);

    // Schema has onDelete: Cascade on addresses, carts, favorites — safe to hard-delete
    await this.prisma.customer.delete({ where: { id: customerId } });

    this.logger.log(`Admin hard-deleted customer ${customerId}`);
    return { message: CommonSuccess.RESOURCE_DELETED };
  }
}
