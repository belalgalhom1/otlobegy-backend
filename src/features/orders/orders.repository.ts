import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  CartErrors,
  OrderErrors,
  CustomerErrors,
} from 'src/common/constants/response.constants';
import {
  DispatchStatus,
  DriverStatus,
  OrderStatus,
  Prisma,
} from '@prisma/client';

export interface CreateOrderData {
  orderNumber: string;
  customerId: string;
  vendorId: string | null;
  vendorBranchId: string | null;
  zoneId: string | null;
  paymentMethod: string;
  deliveryAddress: string;
  deliveryLng: number;
  deliveryLat: number;
  subtotal: number;
  deliveryFee: number;
  driverBonusFee: number;
  serviceFee: number;
  tax: number;
  discount?: number;
  coinsUsed?: number;
  coinsEarned?: number;
  grandTotal: number;
  upfrontAmount: number;
  specialRequest: string | null;
  type: string;
  distanceKm: number;
  pickupAddress: string | null;
  pickupLng: number | null;
  pickupLat: number | null;
  itemDetails: string | null;
  requestedVehicleType: string | null;
}

export interface OrderItemData {
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  specialRequest: string | null;
  options: Array<{ optionId: string; optionName: string; priceAdded: number }>;
}

export interface OrderFilters {
  status?: OrderStatus;
  vendorId?: string;
  customerId?: string;
  driverId?: string;
  page?: number;
  limit?: number;
}

const ORDER_INCLUDE = {
  customer: {
    include: {
      user: { select: { id: true, name: true, phone: true, avatar: true } },
    },
  },
  vendor: {
    select: {
      id: true,
      storeName: true,
      storeNameAr: true,
      logo: true,
      commissionRate: true,
      isContracted: true,
      rating: true,
      ratingCount: true,
    },
  },
  driver: {
    select: {
      id: true,
      name: true,
      avatar: true,
      vehicleType: true,
      vehiclePlate: true,
      rating: true,
      ratingCount: true,
      userId: true,
      mobileWallets: {
        where: { isActive: true },
      },
    },
  },
  items: {
    include: { selectedOptions: true, product: { select: { imageUrl: true } } },
  },
  statusEvents: {
    orderBy: { createdAt: 'desc' as const },
    take: 10,
  },
  review: true,
};

@Injectable()
export class OrdersRepository {
  private readonly logger = new Logger(OrdersRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException(OrderErrors.NOT_FOUND);
    return order;
  }

  async findMany(filters: OrderFilters) {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = { deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.vendorId) where.vendorId = filters.vendorId;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.driverId) where.driverId = filters.driverId;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          customer: {
            include: {
              user: { select: { id: true, name: true, phone: true } },
            },
          },
          vendor: { select: { id: true, storeName: true, logo: true, rating: true, ratingCount: true } },
          driver: {
            select: {
              id: true,
              name: true,
              avatar: true,
              vehicleType: true,
              vehiclePlate: true,
              rating: true,
              ratingCount: true,
              user: { select: { id: true, phone: true } },
            },
          },
          items: { include: { product: { select: { imageUrl: true } } } },
          review: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createOrder(
    data: CreateOrderData,
    items: OrderItemData[],
    actorUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Raw SQL required for geometry field
      await tx.$executeRaw`
        INSERT INTO orders (
          id, "orderNumber", type, "customerId", "vendorId", "vendorBranchId", "zoneId",
          status, "paymentMethod", "paymentStatus",
          "pickupAddress", "pickupLocation",
          "deliveryAddress", "deliveryLocation",
          subtotal, "deliveryFee", "driverBonusFee", "serviceFee", tax, discount, "coinsUsed", "coinsEarned", "grandTotal", "upfrontAmount",
          "itemDetails", "requestedVehicleType",
          "specialRequest", "updatedAt"
        ) VALUES (
          gen_random_uuid()::text,
          ${data.orderNumber},
          ${data.type}::"OrderType",
          ${data.customerId},
          ${data.vendorId},
          ${data.vendorBranchId ?? null},
          ${data.zoneId ?? null},
          ${data.upfrontAmount > 0 ? Prisma.sql`'PENDING_PAYMENT'::"OrderStatus"` : Prisma.sql`'PENDING'::"OrderStatus"`},
          ${data.paymentMethod}::"PaymentMethod",
          ${data.grandTotal <= 0 ? Prisma.sql`'PAID'::"PaymentStatus"` : Prisma.sql`'PENDING'::"PaymentStatus"`},
          ${data.pickupAddress ?? null},
          ${
            data.pickupLng != null && data.pickupLat != null
              ? Prisma.sql`ST_SetSRID(ST_MakePoint(${data.pickupLng}, ${data.pickupLat}), 4326)`
              : Prisma.sql`NULL`
          },
          ${data.deliveryAddress},
          ST_SetSRID(ST_MakePoint(${data.deliveryLng}, ${data.deliveryLat}), 4326),
          ${Math.round(data.subtotal)},
          ${Math.round(data.deliveryFee)},
          ${Math.round(data.driverBonusFee)},
          ${Math.round(data.serviceFee)},
          ${Math.round(data.tax)},
          ${Math.round(data.discount ?? 0)},
          ${Math.round(data.coinsUsed ?? 0)},
          ${Math.round(data.coinsEarned ?? 0)},
          ${Math.round(data.grandTotal)},
          ${Math.round(data.upfrontAmount)},
          ${data.itemDetails ?? null},
          ${data.requestedVehicleType ? Prisma.sql`${data.requestedVehicleType}::"VehicleType"` : Prisma.sql`NULL`},
          ${data.specialRequest ?? null},
          NOW()
        )
      `;

      const created = await tx.order.findFirst({
        where: { orderNumber: data.orderNumber },
        select: { id: true, orderNumber: true },
      });

      if (!created) throw new Error(OrderErrors.INSERT_FAILED);

      if (data.coinsUsed && data.coinsUsed > 0) {
        const result = await tx.customer.updateMany({
          where: { id: data.customerId, coinBalance: { gte: data.coinsUsed } },
          data: { coinBalance: { decrement: data.coinsUsed } },
        });

        if (result.count === 0) {
          throw new BadRequestException(
            CustomerErrors.INSUFFICIENT_COIN_BALANCE,
          );
        }

        // We need the new balance for the transaction record
        const customer = await tx.customer.findUnique({
          where: { id: data.customerId },
          select: { coinBalance: true },
        });

        await tx.customerCoinTransaction.create({
          data: {
            customerId: data.customerId,
            orderId: created.id,
            type: 'SPENT',
            amount: data.coinsUsed,
            balanceAfter: customer!.coinBalance,
            description: `Used coins for order ${data.orderNumber}`,
          },
        });
      }

      const orderItemsData: Prisma.OrderItemCreateManyInput[] = [];
      const orderItemOptionsData: Prisma.OrderItemOptionCreateManyInput[] = [];

      for (const item of items) {
        const orderItemId = randomUUID();
        orderItemsData.push({
          id: orderItemId,
          orderId: created.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
          specialRequest: item.specialRequest,
        });

        if (item.options.length > 0) {
          for (const opt of item.options) {
            orderItemOptionsData.push({
              orderItemId: orderItemId,
              optionId: opt.optionId,
              optionName: opt.optionName,
              priceAdded: opt.priceAdded,
            });
          }
        }
      }

      if (orderItemsData.length > 0) {
        await tx.orderItem.createMany({ data: orderItemsData });
      }
      if (orderItemOptionsData.length > 0) {
        await tx.orderItemOption.createMany({ data: orderItemOptionsData });
      }

      for (const item of items) {
        if (item.variantId) {
          const rows = await tx.$executeRaw`
            UPDATE product_variants
            SET stock = stock - ${item.quantity}
            WHERE id = ${item.variantId} AND stock IS NOT NULL
          `;
        } else if (item.productId) {
          const rows = await tx.$executeRaw`
            UPDATE products
            SET stock = stock - ${item.quantity}
            WHERE id = ${item.productId} AND stock IS NOT NULL
          `;
        }
      }

      await tx.orderStatusEvent.create({
        data: {
          orderId: created.id,
          status: OrderStatus.PENDING,
          createdBy: actorUserId,
        },
      });

      return created;
    });
  }

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    actorUserId: string,
    note?: string,
    extraData?: Prisma.OrderUpdateInput,
    expectedOldStatus?: OrderStatus,
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (expectedOldStatus) {
        const count = await tx.order.updateMany({
          where: { id: orderId, status: expectedOldStatus },
          data: { status, ...extraData },
        });
        if (count.count === 0) {
          throw new BadRequestException(OrderErrors.CONCURRENT_STATE_CHANGE);
        }
      } else {
        await tx.order.update({
          where: { id: orderId },
          data: { status, ...extraData },
        });
      }

      const updated = await tx.order.findUnique({
        where: { id: orderId },
        include: ORDER_INCLUDE,
      });

      if (!updated) throw new Error(OrderErrors.NOT_FOUND);

      await tx.orderStatusEvent.create({
        data: {
          orderId,
          status,
          note: note ?? null,
          createdBy: actorUserId,
        },
      });

      return updated;
    });
  }

  async assignDriver(
    orderId: string,
    driverId: string,
    driverShiftId: string | null,
    actorUserId: string,
    nextStatus: OrderStatus = OrderStatus.DRIVER_ASSIGNED,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Fetch the current order to check if a driver is already assigned
      const existingOrder = await tx.order.findUnique({
        where: { id: orderId },
        select: { driverId: true },
      });

      // If there's an existing driver that is different, release them
      if (existingOrder?.driverId && existingOrder.driverId !== driverId) {
        await tx.driver.update({
          where: { id: existingOrder.driverId },
          data: { status: DriverStatus.ONLINE },
        });
      }

      // Cancel any pending dispatches
      await tx.orderDispatch.updateMany({
        where: { orderId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          driverId,
          driverShiftId,
          status: nextStatus,
          driverAssignedAt: new Date(),
        },
        include: ORDER_INCLUDE,
      });

      await tx.orderStatusEvent.create({
        data: {
          orderId,
          status: nextStatus,
          createdBy: actorUserId,
          note: `Driver manually assigned by admin. ${nextStatus === OrderStatus.PENDING_PAYMENT ? 'Awaiting mobile wallet payment.' : ''}`,
        },
      });

      await tx.driver.update({
        where: { id: driverId },
        data: { status: DriverStatus.ON_DELIVERY },
      });

      return updated;
    });
  }

  async cancelPendingDispatches(orderId: string) {
    return this.prisma.orderDispatch.updateMany({
      where: { orderId, status: DispatchStatus.PENDING },
      data: { status: DispatchStatus.CANCELLED },
    });
  }

  async freeDriver(driverId: string) {
    return this.prisma.driver.update({
      where: { id: driverId },
      data: { status: DriverStatus.ONLINE },
    });
  }

  async clearCart(customerId: string, vendorId: string) {
    return this.prisma.cart.deleteMany({ where: { customerId, vendorId } });
  }

  async getVendorUserIds(vendorId: string | null): Promise<string[]> {
    if (!vendorId) return [];
    const members = await this.prisma.vendorMember.findMany({
      where: { vendorId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  async getZoneAtLocation(lng: number, lat: number) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        baseDeliveryFeeOverride: number | null;
        minOrderAmountOverride: number | null;
      }>
    >`
      SELECT id, "baseDeliveryFeeOverride", "minOrderAmountOverride"
      FROM zones
      WHERE ST_Contains(boundary, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
        AND "isActive" = true
      ORDER BY ST_Area(boundary) ASC
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  async getNearestOpenBranchLocation(
    vendorId: string,
    toLng: number,
    toLat: number,
  ): Promise<{ id: string; lng: number; lat: number } | null> {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; lng: number; lat: number }>
    >`
      SELECT
        id,
        ST_X(location::geometry) AS lng,
        ST_Y(location::geometry) AS lat
      FROM vendor_branches
      WHERE "vendorId"::text = ${vendorId}::text
        AND "isOpen" = true
      ORDER BY ST_Distance(
        location::geography,
        ST_SetSRID(ST_MakePoint(${toLng}, ${toLat}), 4326)::geography
      ) ASC
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  async getDistanceKm(
    fromLng: number,
    fromLat: number,
    toLng: number,
    toLat: number,
  ): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ km: number }>>`
      SELECT ST_Distance(
        ST_SetSRID(ST_MakePoint(${fromLng}, ${fromLat}), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${toLng}, ${toLat}), 4326)::geography
      ) / 1000 AS km
    `;
    return Number(rows[0]?.km ?? 3);
  }

  async generateOrderNumber(): Promise<string> {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ nextval: bigint }>>`
        SELECT nextval('order_number_seq')
      `;
      const seq = rows[0].nextval.toString().padStart(6, '0');
      return `ORD-${seq}`;
    } catch (e) {
      this.logger.warn(
        `Failed to use database sequence 'order_number_seq', using fallback: ${e}`,
      );
      // Fallback: ORD- + last 6 digits of timestamp + 4 random digits
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(1000 + Math.random() * 9000).toString();
      return `ORD-${timestamp}${random}`;
    }
  }
}
