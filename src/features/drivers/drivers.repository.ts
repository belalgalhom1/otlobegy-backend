import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  DriverStatus,
  DriverShiftStatus,
  Prisma,
  VehicleType,
  Role,
  WalletTransactionType,
} from '@prisma/client';
import { DriverErrors } from 'src/common/constants/response.constants';

@Injectable()
export class DriversRepository {
  private readonly logger = new Logger(DriversRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(driverId: string) {
    return this.prisma.driver.findUnique({
      where: { id: driverId },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.driver.findUnique({
      where: { userId },
    });
  }

  async findByUserIdWithUser(userId: string) {
    return this.prisma.driver.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
      },
    });
  }

  async create(data: {
    userId: string;
    name: string;
    nationalId?: string | null;
    licenseNumber?: string | null;
    vehicleType: string;
    vehiclePlate?: string | null;
  }) {
    return this.prisma.driver.create({
      data: {
        userId: data.userId,
        name: data.name,
        nationalId: data.nationalId ?? null,
        licenseNumber: data.licenseNumber ?? null,
        vehicleType: data.vehicleType as VehicleType,
        vehiclePlate: data.vehiclePlate ?? null,
        status: DriverStatus.OFFLINE,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
      },
    });
  }

  async update(driverId: string, data: Prisma.DriverUpdateInput) {
    return this.prisma.driver.update({
      where: { id: driverId },
      data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
      },
    });
  }

  async updateStatus(driverId: string, status: DriverStatus) {
    return this.prisma.driver.update({
      where: { id: driverId },
      data: { status },
    });
  }

  async updateLastLocation(driverId: string, lng: number, lat: number) {
    await this.prisma.$executeRaw`
      UPDATE drivers
      SET
        "lastLocation" = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
        "lastLocationUpdate" = NOW()
      WHERE id = ${driverId}
    `;
  }

  async updateAvatar(driverId: string, avatarUrl: string) {
    return this.prisma.driver.update({
      where: { id: driverId },
      data: { avatar: avatarUrl },
    });
  }

  async updateUserRole(userId: string, role: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: role as Role },
    });
  }

  async findAll(filters: {
    status?: DriverStatus;
    search?: string;
    page: number;
    limit: number;
  }) {
    const { page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.DriverWhereInput = { deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
        { vehiclePlate: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [drivers, total] = await Promise.all([
      this.prisma.driver.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      }),
      this.prisma.driver.count({ where }),
    ]);

    return {
      drivers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneAdmin(driverId: string) {
    return this.prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isBanned: true,
          },
        },
        _count: { select: { orders: true, shifts: true } },
      },
    });
  }

  // ─── Shifts ───────────────────────────────────────────────────────────────

  async createShift(data: {
    driverId: string;
    zoneId: string | null;
    startTime: Date;
    endTime: Date;
  }) {
    return this.prisma.driverShift.create({
      data: {
        driverId: data.driverId,
        zoneId: data.zoneId,
        shiftDate: data.startTime,
        startTime: data.startTime,
        endTime: data.endTime,
        status: DriverShiftStatus.SCHEDULED,
      },
    });
  }

  async findShiftsByDriver(driverId: string) {
    return this.prisma.driverShift.findMany({
      where: { driverId },
      orderBy: { startTime: 'desc' },
      take: 20,
      include: {
        zone: true,
      },
    });
  }

  async findShiftById(shiftId: string, driverId: string) {
    return this.prisma.driverShift.findFirst({
      where: { id: shiftId, driverId },
    });
  }

  async findOverlappingShift(driverId: string, startTime: Date, endTime: Date) {
    return this.prisma.driverShift.findFirst({
      where: {
        driverId,
        status: { in: [DriverShiftStatus.SCHEDULED, DriverShiftStatus.ACTIVE] },
        OR: [{ startTime: { lte: endTime }, endTime: { gte: startTime } }],
      },
    });
  }

  async updateShift(shiftId: string, data: Prisma.DriverShiftUpdateInput) {
    return this.prisma.driverShift.update({
      where: { id: shiftId },
      data,
    });
  }

  async endShiftSafely(shiftId: string, data: Prisma.DriverShiftUpdateInput) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.driverShift.updateMany({
        where: { id: shiftId, status: DriverShiftStatus.ACTIVE },
        data,
      });

      if (result.count === 0) {
        throw new Error(DriverErrors.SHIFT_NOT_ACTIVE);
      }

      return tx.driverShift.findUnique({ where: { id: shiftId } });
    });
  }

  async startShiftSafely(shiftId: string, driverId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Check for existing active shift
      const activeShift = await tx.driverShift.findFirst({
        where: { driverId, status: DriverShiftStatus.ACTIVE },
      });
      if (activeShift) {
        throw new Error(DriverErrors.ACTIVE_SHIFT_EXISTS);
      }

      const result = await tx.driverShift.updateMany({
        where: { id: shiftId, driverId, status: DriverShiftStatus.SCHEDULED },
        data: { status: DriverShiftStatus.ACTIVE, actualStart: new Date() },
      });

      if (result.count === 0) {
        return null;
      }

      return tx.driverShift.findUnique({ where: { id: shiftId } });
    });
  }

  async countDeliveredOrdersInShift(shiftId: string): Promise<number> {
    return this.prisma.order.count({
      where: { driverShiftId: shiftId, status: 'DELIVERED' },
    });
  }

  async sumShiftEarnings(shiftId: string): Promise<number> {
    const result = await this.prisma.driverWalletTransaction.aggregate({
      where: {
        driverShiftId: shiftId,
        type: { in: ['DELIVERY_FEE', 'BONUS'] },
      },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  // ─── Wallet ───────────────────────────────────────────────────────────────

  async getWalletTransactions(driverId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.driverWalletTransaction.findMany({
        where: { driverId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: { select: { id: true, orderNumber: true } },
        },
      }),
      this.prisma.driverWalletTransaction.count({ where: { driverId } }),
    ]);

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async creditWallet(
    driverId: string,
    amount: number,
    type: string,
    orderId: string | null,
    driverShiftId: string | null,
    description: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const driver = await tx.driver.update({
        where: { id: driverId },
        data: { walletBalance: { increment: amount } },
        select: { walletBalance: true },
      });

      await tx.driverWalletTransaction.create({
        data: {
          driverId,
          orderId,
          driverShiftId,
          type: type as WalletTransactionType,
          amount,
          balanceAfter: driver.walletBalance,
          description,
        },
      });

      return driver.walletBalance;
    });
  }

  // ─── Active order lookup for location broadcast ───────────────────────────

  async findActiveOrderForDriver(driverId: string) {
    return this.prisma.order.findFirst({
      where: {
        driverId,
        status: { in: ['DRIVER_ASSIGNED', 'PICKED_UP'] },
      },
      select: {
        id: true,
        customer: { select: { userId: true } },
      },
    });
  }
}
