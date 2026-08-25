import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StatisticsRepository } from './statistics.repository';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { OrderSettledEvent, DriverStatusChangedEvent } from 'src/common/events';
import { EVENTS } from 'src/common/events/event-names';
import { SocketService } from '../../infrastructure/socket/socket.service';
import { StatisticPeriod, DriverStatus } from '@prisma/client';

export interface SettleOrderPayload {
  orderId: string;
  orderNumber: string;
  orderType: string;
  vendorId: string | null;
  driverId: string;
  driverShiftId: string | null;
  grandTotal: number;
  upfrontAmount: number;
  distanceKm: number;
  driverTier: string;
  deliveryFee: number;
  driverBonusFee: number;
  subtotal: number;
  tax: number;
  commissionRate: number;
  deliveryCommissionRate: number;
  isContracted: boolean;
  paymentMethod: string;
  customerId: string;
  coinsEarned: number;
  coinsUsed: number;
  discount: number;
}

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(
    private readonly statsRepository: StatisticsRepository,
    private readonly prisma: PrismaService,
    private readonly platformSettings: PlatformSettingsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly socketService: SocketService,
  ) {}

  // ─── Settle a delivered order ─────────────────────────────────────────────

  async settleOrder(payload: SettleOrderPayload): Promise<void> {
    const {
      orderId,
      orderNumber,
      vendorId,
      driverId,
      driverShiftId,
      orderType,
      grandTotal,
      deliveryFee,
      driverBonusFee,
      subtotal,
      tax,
      commissionRate,
      deliveryCommissionRate,
      isContracted,
      paymentMethod,
      customerId,
      coinsEarned,
      coinsUsed,
      discount,
      distanceKm,
      driverTier,
    } = payload;

    // Business rules for revenue split:
    // If the vendor is contracted: commission is paid by the vendor.
    // If NOT contracted: customer pays commission as a service fee, so the vendor receives the full subtotal.
    const commission = Math.round(subtotal * (commissionRate / 100));

    const vendorRevenue = subtotal;

    // Recalculate driver delivery fee based on tier
    // Customer paid based on Gold tier. We subtract the difference if the driver is not Gold.
    const settings = await this.platformSettings.getSettings();
    const goldBonus = Number(settings.goldTierBonusPerKm ?? 0);
    const silverBonus = Number(settings.silverTierBonusPerKm ?? 0);
    const bronzeBonus = Number(settings.bronzeTierBonusPerKm ?? 0);

    let driverActualBonus = goldBonus;
    if (driverTier === 'SILVER') driverActualBonus = silverBonus;
    if (driverTier === 'BRONZE') driverActualBonus = bronzeBonus;

    const tierDifferencePerKm = goldBonus - driverActualBonus;
    const driverDeliveryFee =
      settings.driverShiftsEnabled &&
      orderType === 'STANDARD' &&
      tierDifferencePerKm > 0
        ? Math.max(0, deliveryFee - tierDifferencePerKm * distanceKm)
        : deliveryFee;

    const driverShare = 1 - deliveryCommissionRate / 100;
    const driverEarnings = Math.round(driverDeliveryFee * driverShare);
    const applicationDeliveryCut = deliveryFee - driverEarnings;

    // Sequentially process driver and vendor wallets to prevent DB row deadlocks
    const platformRevenue = commission + applicationDeliveryCut;
    const isDriverCollected = paymentMethod === 'CASH_ON_DELIVERY' || paymentMethod === 'MOBILE_WALLET';
    
    if (isDriverCollected) {
      await this.creditDriverWallet(
        driverId,
        -grandTotal,
        orderId,
        driverShiftId,
        `Collected payment (COD/Mobile Wallet) for order ${orderNumber}`,
        'CASH_COLLECTED',
      );
    }

    await this.creditDriverWallet(
      driverId,
      driverEarnings,
      orderId,
      driverShiftId,
      `Delivery fee for order ${orderNumber}`,
      'DELIVERY_FEE',
    );

    if (driverBonusFee > 0) {
      await this.creditDriverWallet(
        driverId,
        driverBonusFee,
        orderId,
        driverShiftId,
        `Time-based bonus for order ${orderNumber}`,
        'BONUS',
      );
    }

    if (payload.upfrontAmount > 0) {
      await this.creditDriverWallet(
        driverId,
        payload.upfrontAmount,
        orderId,
        driverShiftId,
        `Reimbursement for online upfront payment`,
        'ADJUSTMENT',
      );
    }

    // Fetch updated wallet balance after transactions
    const driverSnapshot = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, userId: true, status: true, walletBalance: true },
    });

    const isNegativeBalance = (driverSnapshot?.walletBalance ?? 0) < -((settings as any).maxNegativeDriverBalance ?? 500);
    const isCashLock = isDriverCollected && !isContracted;
    const shouldLock = isCashLock || isNegativeBalance;

    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        totalOrders: { increment: 1 },
        hasUnpaidCommission: shouldLock ? true : undefined,
        status: shouldLock ? DriverStatus.SUSPENDED : undefined,
      },
      select: { id: true, userId: true, status: true },
    });

    if (shouldLock) {
      this.logger.warn(`Driver ${driverId} locked out due to unpaid commission on driver-collected order ${orderNumber}.`);
      
      this.socketService.disconnectUser(driver.userId);

      this.eventEmitter.emit(
        EVENTS.DRIVER_STATUS_CHANGED,
        new DriverStatusChangedEvent(
          driver.id,
          driver.userId,
          DriverStatus.ONLINE, // Approximation of previous state
          DriverStatus.SUSPENDED,
          'UNPAID_COMMISSION',
        ),
      );
    }

    if (coinsEarned > 0) {
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.customerCoinTransaction.findFirst({
          where: { orderId, type: 'EARNED' },
        });
        if (existing) return;

        const customer = await tx.customer.update({
          where: { id: customerId },
          data: { coinBalance: { increment: coinsEarned } },
          select: { coinBalance: true },
        });

        await tx.customerCoinTransaction.create({
          data: {
            customerId,
            orderId,
            type: 'EARNED',
            amount: coinsEarned,
            balanceAfter: customer.coinBalance,
            description: `Earned coins from order ${orderNumber}`,
          },
        });
      });
    }

    if (vendorId) {
      // Vendor wallet: credit revenue (either subtotal-commission or full subtotal)
      await this.statsRepository.creditVendorWallet(
        vendorId,
        vendorRevenue,
        'ORDER_REVENUE',
        orderId,
        `Order ${orderNumber} revenue`,
      );

      // Debit commission from vendor wallet ONLY if they are contracted
      if (isContracted) {
        await this.statsRepository.debitVendorWallet(
          vendorId,
          commission,
          'COMMISSION_DEDUCTION',
          orderId,
          `Commission for order ${orderNumber}`,
        );
      }
    }

    const now = new Date();
    const periods = this.statsRepository.getPeriodsForDate(now);

    // Upsert all stat periods concurrently
    await Promise.all(
      periods.flatMap(({ period, startDate, endDate }) => {
        const jobs: Promise<any>[] = [];

        if (vendorId) {
          jobs.push(
            this.statsRepository.upsertVendorStat(
              vendorId,
              period,
              startDate,
              endDate,
              {
                totalOrders: 1,
                totalRevenue: vendorRevenue,
                totalCommission: commission,
                totalTax: tax,
                completedOrders: 1,
              },
            ),
          );
        }
        jobs.push(
          this.statsRepository.upsertDriverStat(
            driverId,
            period,
            startDate,
            endDate,
            {
              totalOrders: 1,
              totalEarnings: driverEarnings,
              completedOrders: 1,
            },
          ),
          this.statsRepository.upsertAppStat(period, startDate, endDate, {
            totalOrders: 1,
            totalAdminRevenue: platformRevenue,
            totalDeliveryFees: deliveryFee,
          }),
        );
        return jobs;
      }),
    );

    // Emit settled event — listeners can send receipts etc.
    this.eventEmitter.emit(
      EVENTS.ORDER_SETTLED,
      new OrderSettledEvent(
        orderId,
        orderNumber,
        vendorId,
        driverId,
        driverShiftId,
        grandTotal,
        deliveryFee,
        commissionRate,
        0, // taxRate not stored on payload; pass 0 or extend payload if needed
      ),
    );

    this.logger.log(
      `Order ${orderNumber} settled — ` +
        `vendor: +${vendorRevenue} -${commission} commission, ` +
        `driver: +${driverEarnings}, platform: +${platformRevenue}`,
    );
  }

  // ─── Record cancelled order ───────────────────────────────────────────────

  async recordCancellation(
    vendorId: string | null,
    driverId: string | null,
  ): Promise<void> {
    const now = new Date();
    const periods = this.statsRepository.getPeriodsForDate(now);

    await Promise.all(
      periods.flatMap(({ period, startDate, endDate }) => {
        const jobs: Promise<any>[] = [
          this.statsRepository.upsertAppStat(period, startDate, endDate, {
            totalOrders: 1,
          }),
        ];

        if (vendorId) {
          jobs.push(
            this.statsRepository.upsertVendorStat(
              vendorId,
              period,
              startDate,
              endDate,
              {
                totalOrders: 1,
                cancelledOrders: 1,
              },
            ),
          );
        }

        if (driverId) {
          jobs.push(
            this.statsRepository.upsertDriverStat(
              driverId,
              period,
              startDate,
              endDate,
              {
                totalOrders: 1,
                cancelledOrders: 1,
              },
            ),
          );
        }

        return jobs;
      }),
    );
  }

  // ─── Dispatch counters ────────────────────────────────────────────────────

  async recordDispatchSent(driverId: string): Promise<void> {
    const periods = this.statsRepository.getPeriodsForDate(new Date());
    await Promise.all(
      periods.map(({ period, startDate, endDate }) =>
        this.statsRepository.upsertDriverStat(
          driverId,
          period,
          startDate,
          endDate,
          {
            totalDispatchesReceived: 1,
          },
        ),
      ),
    );
  }

  async recordDispatchAccepted(driverId: string): Promise<void> {
    const periods = this.statsRepository.getPeriodsForDate(new Date());
    await Promise.all(
      periods.map(({ period, startDate, endDate }) =>
        this.statsRepository.upsertDriverStat(
          driverId,
          period,
          startDate,
          endDate,
          {
            dispatchesAccepted: 1,
          },
        ),
      ),
    );
  }

  async recordDispatchRejected(driverId: string): Promise<void> {
    const periods = this.statsRepository.getPeriodsForDate(new Date());
    await Promise.all(
      periods.map(({ period, startDate, endDate }) =>
        this.statsRepository.upsertDriverStat(
          driverId,
          period,
          startDate,
          endDate,
          {
            dispatchesRejected: 1,
          },
        ),
      ),
    );
  }

  async recordDispatchExpired(driverId: string): Promise<void> {
    const periods = this.statsRepository.getPeriodsForDate(new Date());
    await Promise.all(
      periods.map(({ period, startDate, endDate }) =>
        this.statsRepository.upsertDriverStat(
          driverId,
          period,
          startDate,
          endDate,
          {
            dispatchesExpired: 1,
          },
        ),
      ),
    );
  }

  // ─── Read stats ───────────────────────────────────────────────────────────

  async getVendorStats(vendorId: string, period: StatisticPeriod, limit = 30) {
    return this.statsRepository.getVendorStats(vendorId, period, limit);
  }

  async getDriverStats(driverId: string, period: StatisticPeriod, limit = 30) {
    return this.statsRepository.getDriverStats(driverId, period, limit);
  }

  async getMyDriverStats(userId: string, period: StatisticPeriod, limit = 30) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!driver) return [];
    return this.statsRepository.getDriverStats(driver.id, period, limit);
  }

  async getAppStats(period: StatisticPeriod, limit = 30) {
    return this.statsRepository.getAppStats(period, limit);
  }

  async getMostOrderedProduct(vendorId: string) {
    // Tiebreaker: 1. Higher quantity sold (totalOrders), 2. More recent activity (lastOrderedAt), 3. Lower productId
    const result = await this.prisma.$queryRaw<
      Array<{ productId: string; totalOrders: number; lastOrderedAt: Date }>
    >`
      SELECT 
        oi."productId" as "productId", 
        SUM(oi.quantity)::int as "totalOrders",
        MAX(o."createdAt") as "lastOrderedAt"
      FROM order_items oi
      JOIN orders o ON o.id = oi."orderId"
      WHERE o."vendorId" = ${vendorId} AND o.status = 'DELIVERED' AND oi."productId" IS NOT NULL
      GROUP BY oi."productId"
      ORDER BY "totalOrders" DESC, "lastOrderedAt" DESC, oi."productId" ASC
      LIMIT 1
    `;

    if (!result || result.length === 0) {
      return null;
    }

    const stats = result[0];
    const product = await this.prisma.product.findUnique({
      where: { id: stats.productId },
      select: {
        id: true,
        name: true,
        nameAr: true,
        imageUrl: true,
      },
    });

    if (!product) {
      return null;
    }

    return {
      vendorId,
      productId: stats.productId,
      totalOrders: stats.totalOrders,
      productName: product.name,
      productNameAr: product.nameAr,
      productImage: product.imageUrl,
    };
  }

  // ─── Analytics Leaderboards ───────────────────────────────────────────────

  async getTopDrivers(limit: number) {
    return this.statsRepository.getTopDrivers(limit);
  }

  async getTopCustomers(limit: number) {
    return this.statsRepository.getTopCustomers(limit);
  }

  async getTopVendors(limit: number) {
    return this.statsRepository.getTopVendors(limit);
  }

  async getTopProducts(limit: number) {
    return this.statsRepository.getTopProducts(limit);
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async creditDriverWallet(
    driverId: string,
    amount: number,
    orderId: string,
    driverShiftId: string | null,
    description: string,
    type:
      | 'DELIVERY_FEE'
      | 'BONUS'
      | 'ADJUSTMENT'
      | 'PENALTY'
      | 'PAYOUT'
      | 'CASH_COLLECTED'
      | 'CASH_HANDED_TO_VENDOR' = 'DELIVERY_FEE',
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Acquire row lock on the driver to serialize concurrent transactions
      await tx.$executeRaw`SELECT id FROM drivers WHERE id = ${driverId} FOR UPDATE`;

      const existing = await tx.driverWalletTransaction.findFirst({
        where: { orderId, type },
      });
      if (existing) return;

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
          type,
          amount,
          balanceAfter: driver.walletBalance,
          description,
        },
      });
    });
  }
}
