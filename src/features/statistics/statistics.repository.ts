import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { StatisticPeriod, VendorTransactionType } from '@prisma/client';

export interface StatPeriodRange {
  period: StatisticPeriod;
  startDate: Date;
  endDate: Date;
}

@Injectable()
export class StatisticsRepository {
  private readonly logger = new Logger(StatisticsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Period helpers ───────────────────────────────────────────────────────

  getPeriodsForDate(date: Date): StatPeriodRange[] {
    const d = new Date(date);

    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      23,
      59,
      59,
      999,
    );

    // Week: Monday → Sunday
    const dow = d.getDay();
    const diffToMonday = dow === 0 ? -6 : 1 - dow;
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(
      d.getFullYear(),
      d.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const yearStart = new Date(d.getFullYear(), 0, 1);
    const yearEnd = new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);

    return [
      { period: StatisticPeriod.DAILY, startDate: dayStart, endDate: dayEnd },
      {
        period: StatisticPeriod.WEEKLY,
        startDate: weekStart,
        endDate: weekEnd,
      },
      {
        period: StatisticPeriod.MONTHLY,
        startDate: monthStart,
        endDate: monthEnd,
      },
      {
        period: StatisticPeriod.YEARLY,
        startDate: yearStart,
        endDate: yearEnd,
      },
    ];
  }

  // ─── Vendor stats — atomic upsert ─────────────────────────────────────────
  // Uses INSERT … ON CONFLICT DO UPDATE to avoid race conditions

  async upsertVendorStat(
    vendorId: string,
    period: StatisticPeriod,
    startDate: Date,
    endDate: Date,
    increment: {
      totalOrders?: number;
      totalRevenue?: number;
      totalCommission?: number;
      totalTax?: number;
      completedOrders?: number;
      cancelledOrders?: number;
    },
  ) {
    const to = increment.totalOrders ?? 0;
    const tr = increment.totalRevenue ?? 0;
    const tc = increment.totalCommission ?? 0;
    const tt = increment.totalTax ?? 0;
    const co = increment.completedOrders ?? 0;
    const ca = increment.cancelledOrders ?? 0;

    await this.prisma.$executeRaw`
      INSERT INTO vendor_statistics (
        id, "vendorId", period, "startDate", "endDate",
        "totalOrders", "totalRevenue", "totalCommission", "totalTax",
        "completedOrders", "cancelledOrders", "updatedAt"
      )
      VALUES (
        gen_random_uuid(),
        ${vendorId},
        ${period}::"StatisticPeriod",
        ${startDate},
        ${endDate},
        ${to}, ${tr}, ${tc}, ${tt}, ${co}, ${ca},
        NOW()
      )
      ON CONFLICT ("vendorId", period, "startDate")
      DO UPDATE SET
        "totalOrders"      = vendor_statistics."totalOrders"      + EXCLUDED."totalOrders",
        "totalRevenue"     = vendor_statistics."totalRevenue"     + EXCLUDED."totalRevenue",
        "totalCommission"  = vendor_statistics."totalCommission"  + EXCLUDED."totalCommission",
        "totalTax"         = vendor_statistics."totalTax"         + EXCLUDED."totalTax",
        "completedOrders"  = vendor_statistics."completedOrders"  + EXCLUDED."completedOrders",
        "cancelledOrders"  = vendor_statistics."cancelledOrders"  + EXCLUDED."cancelledOrders",
        "updatedAt"        = NOW()
    `;
  }

  async getVendorStats(vendorId: string, period: StatisticPeriod, limit = 30) {
    return this.prisma.vendorStatistic.findMany({
      where: { vendorId, period },
      orderBy: { startDate: 'desc' },
      take: limit,
    });
  }

  // ─── Driver stats — atomic upsert ─────────────────────────────────────────

  async upsertDriverStat(
    driverId: string,
    period: StatisticPeriod,
    startDate: Date,
    endDate: Date,
    increment: {
      totalOrders?: number;
      totalEarnings?: number;
      completedOrders?: number;
      cancelledOrders?: number;
      totalDispatchesReceived?: number;
      dispatchesAccepted?: number;
      dispatchesRejected?: number;
      dispatchesExpired?: number;
    },
  ) {
    const to = increment.totalOrders ?? 0;
    const te = increment.totalEarnings ?? 0;
    const co = increment.completedOrders ?? 0;
    const ca = increment.cancelledOrders ?? 0;
    const tdr = increment.totalDispatchesReceived ?? 0;
    const da = increment.dispatchesAccepted ?? 0;
    const dr = increment.dispatchesRejected ?? 0;
    const de = increment.dispatchesExpired ?? 0;

    await this.prisma.$executeRaw`
      INSERT INTO driver_statistics (
        id, "driverId", period, "startDate", "endDate",
        "totalOrders", "totalEarnings",
        "completedOrders", "cancelledOrders",
        "totalDispatchesReceived", "dispatchesAccepted",
        "dispatchesRejected", "dispatchesExpired",
        "updatedAt"
      )
      VALUES (
        gen_random_uuid(),
        ${driverId},
        ${period}::"StatisticPeriod",
        ${startDate},
        ${endDate},
        ${to}, ${te}, ${co}, ${ca}, ${tdr}, ${da}, ${dr}, ${de},
        NOW()
      )
      ON CONFLICT ("driverId", period, "startDate")
      DO UPDATE SET
        "totalOrders"              = driver_statistics."totalOrders"              + EXCLUDED."totalOrders",
        "totalEarnings"            = driver_statistics."totalEarnings"            + EXCLUDED."totalEarnings",
        "completedOrders"          = driver_statistics."completedOrders"          + EXCLUDED."completedOrders",
        "cancelledOrders"          = driver_statistics."cancelledOrders"          + EXCLUDED."cancelledOrders",
        "totalDispatchesReceived"  = driver_statistics."totalDispatchesReceived"  + EXCLUDED."totalDispatchesReceived",
        "dispatchesAccepted"       = driver_statistics."dispatchesAccepted"       + EXCLUDED."dispatchesAccepted",
        "dispatchesRejected"       = driver_statistics."dispatchesRejected"       + EXCLUDED."dispatchesRejected",
        "dispatchesExpired"        = driver_statistics."dispatchesExpired"        + EXCLUDED."dispatchesExpired",
        "updatedAt"                = NOW()
    `;
  }

  async getDriverStats(driverId: string, period: StatisticPeriod, limit = 30) {
    return this.prisma.driverStatistic.findMany({
      where: { driverId, period },
      orderBy: { startDate: 'desc' },
      take: limit,
    });
  }

  // ─── Analytics leaderboards ───────────────────────────────────────────────

  async getTopDrivers(limit = 20) {
    return this.prisma.driver.findMany({
      orderBy: { totalOrders: 'desc' },
      take: limit,
      select: {
        id: true,
        totalOrders: true,
        walletBalance: true,
        tier: true,
        status: true,
        user: {
          select: { name: true, phone: true, avatar: true },
        },
        shifts: {
          select: { actualStart: true, actualEnd: true },
          where: { actualEnd: { not: null } },
          orderBy: { actualStart: 'desc' },
          take: 50,
        },
      },
    });
  }

  async getTopCustomers(limit = 20) {
    const rawCustomers = await this.prisma.$queryRaw<
      Array<{ customerId: string; totalOrders: number; totalSpent: number }>
    >`
      SELECT "customerId", COUNT(id)::int as "totalOrders", SUM("grandTotal")::int as "totalSpent"
      FROM orders
      WHERE status = 'DELIVERED'
      GROUP BY "customerId"
      ORDER BY "totalSpent" DESC, "totalOrders" DESC
      LIMIT ${limit}
    `;

    return Promise.all(
      rawCustomers.map(async (c) => {
        const customer = await this.prisma.customer.findUnique({
          where: { id: c.customerId },
          select: {
            id: true,
            coinBalance: true,
            user: {
              select: { name: true, phone: true, avatar: true },
            },
          },
        });
        return {
          ...customer,
          totalOrders: c.totalOrders,
          totalSpent: c.totalSpent,
        };
      })
    );
  }

  async getTopVendors(limit = 20) {
    const topVendorStats = await this.prisma.$queryRaw<
      Array<{ vendorId: string; totalOrders: number; totalRevenue: number }>
    >`
      SELECT "vendorId", SUM("totalOrders")::int as "totalOrders", SUM("totalRevenue")::int as "totalRevenue"
      FROM vendor_statistics
      GROUP BY "vendorId"
      ORDER BY "totalOrders" DESC
      LIMIT ${limit}
    `;

    // Attach most-ordered product for each vendor
    const results = await Promise.all(
      topVendorStats.map(async (v) => {
        const vendor = await this.prisma.vendor.findUnique({
          where: { id: v.vendorId },
          select: { id: true, storeName: true, storeNameAr: true, logo: true, walletBalance: true },
        });

        const top = await this.prisma.$queryRaw<
          Array<{ productId: string; totalOrders: number }>
        >`
          SELECT oi."productId", SUM(oi.quantity)::int as "totalOrders"
          FROM order_items oi
          JOIN orders o ON o.id = oi."orderId"
          WHERE o."vendorId" = ${v.vendorId} AND o.status = 'DELIVERED' AND oi."productId" IS NOT NULL
          GROUP BY oi."productId"
          ORDER BY "totalOrders" DESC
          LIMIT 1
        `;
        let topProduct: { name: string; nameAr: string | null; imageUrl: string | null; totalOrders: number } | null = null;
        if (top.length > 0) {
          const p = await this.prisma.product.findUnique({
            where: { id: top[0].productId },
            select: { name: true, nameAr: true, imageUrl: true },
          });
          if (p) topProduct = { ...p, totalOrders: top[0].totalOrders };
        }
        return { 
          ...vendor, 
          totalOrders: v.totalOrders,
          totalRevenue: v.totalRevenue,
          topProduct 
        };
      }),
    );
    return results;
  }

  async getTopProducts(limit = 20) {
    const rawProducts = await this.prisma.$queryRaw<
      Array<{ productId: string; totalOrders: number }>
    >`
      SELECT oi."productId", SUM(oi.quantity)::int as "totalOrders"
      FROM order_items oi
      JOIN orders o ON o.id = oi."orderId"
      WHERE o.status = 'DELIVERED' AND oi."productId" IS NOT NULL
      GROUP BY oi."productId"
      ORDER BY "totalOrders" DESC
      LIMIT ${limit}
    `;

    return Promise.all(
      rawProducts.map(async (rp) => {
        const product = await this.prisma.product.findUnique({
          where: { id: rp.productId },
          select: { name: true, nameAr: true, imageUrl: true },
        });
        return {
          ...product,
          totalOrders: rp.totalOrders,
        };
      })
    );
  }

  // ─── App stats — atomic upsert ────────────────────────────────────────────

  async upsertAppStat(
    period: StatisticPeriod,
    startDate: Date,
    endDate: Date,
    increment: {
      totalOrders?: number;
      totalAdminRevenue?: number;
      totalDeliveryFees?: number;
      activeCustomers?: number;
      activeDrivers?: number;
    },
  ) {
    const to = increment.totalOrders ?? 0;
    const tar = increment.totalAdminRevenue ?? 0;
    const tdf = increment.totalDeliveryFees ?? 0;
    const ac = increment.activeCustomers ?? 0;
    const ad = increment.activeDrivers ?? 0;

    await this.prisma.$executeRaw`
      INSERT INTO app_statistics (
        id, period, "startDate", "endDate",
        "totalOrders", "totalAdminRevenue", "totalDeliveryFees",
        "activeCustomers", "activeDrivers",
        "updatedAt"
      )
      VALUES (
        gen_random_uuid(),
        ${period}::"StatisticPeriod",
        ${startDate},
        ${endDate},
        ${to}, ${tar}, ${tdf}, ${ac}, ${ad},
        NOW()
      )
      ON CONFLICT (period, "startDate")
      DO UPDATE SET
        "totalOrders"        = app_statistics."totalOrders"        + EXCLUDED."totalOrders",
        "totalAdminRevenue"  = app_statistics."totalAdminRevenue"  + EXCLUDED."totalAdminRevenue",
        "totalDeliveryFees"  = app_statistics."totalDeliveryFees"  + EXCLUDED."totalDeliveryFees",
        "updatedAt"          = NOW()
    `;
  }

  async getAppStats(period: StatisticPeriod, limit = 30) {
    return this.prisma.appStatistic.findMany({
      where: { period },
      orderBy: { startDate: 'desc' },
      take: limit,
    });
  }

  // ─── Vendor wallet ────────────────────────────────────────────────────────

  async creditVendorWallet(
    vendorId: string,
    amount: number,
    type: string,
    orderId: string | null,
    description: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Acquire row lock on the vendor to serialize concurrent transactions
      await tx.$executeRaw`SELECT id FROM vendors WHERE id = ${vendorId} FOR UPDATE`;

      if (orderId) {
        const existing = await tx.vendorWalletTransaction.findFirst({
          where: { orderId, type: type as VendorTransactionType },
        });
        if (existing) return existing.balanceAfter;
      }

      const vendor = await tx.vendor.update({
        where: { id: vendorId },
        data: { walletBalance: { increment: amount } },
        select: { walletBalance: true },
      });

      await tx.vendorWalletTransaction.create({
        data: {
          vendorId,
          orderId,
          type: type as VendorTransactionType,
          amount,
          balanceAfter: vendor.walletBalance,
          description,
        },
      });

      return vendor.walletBalance;
    });
  }

  async debitVendorWallet(
    vendorId: string,
    amount: number,
    type: string,
    orderId: string | null,
    description: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Acquire row lock on the vendor to serialize concurrent transactions
      await tx.$executeRaw`SELECT id FROM vendors WHERE id = ${vendorId} FOR UPDATE`;

      if (orderId) {
        const existing = await tx.vendorWalletTransaction.findFirst({
          where: { orderId, type: type as VendorTransactionType },
        });
        if (existing) return existing.balanceAfter;
      }

      const vendor = await tx.vendor.update({
        where: { id: vendorId },
        data: { walletBalance: { decrement: amount } },
        select: { walletBalance: true },
      });

      await tx.vendorWalletTransaction.create({
        data: {
          vendorId,
          orderId,
          type: type as VendorTransactionType,
          amount: -amount,
          balanceAfter: vendor.walletBalance,
          description,
        },
      });

      return vendor.walletBalance;
    });
  }
}
