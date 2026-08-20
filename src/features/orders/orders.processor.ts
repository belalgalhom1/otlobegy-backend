import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue, UnrecoverableError } from 'bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { StatisticsService } from '../statistics/statistics.service';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { OrdersRepository } from './orders.repository';
import {
  QUEUES,
  ORDER_JOBS,
  CRON_JOBS,
} from '../../infrastructure/queue/queues.constants';
import { OrderStatus, DispatchStatus } from '@prisma/client';
import { CartService } from '../cart/cart.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Processor(QUEUES.ORDERS, { concurrency: 25 })
export class OrdersProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(OrdersProcessor.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly ordersRepository: OrdersRepository,
    private readonly statisticsService: StatisticsService,
    private readonly platformSettings: PlatformSettingsService,
    private readonly prisma: PrismaService,
      private readonly cartService: CartService,
    @InjectQueue(QUEUES.ORDERS) private readonly queue: Queue,
    @InjectQueue(QUEUES.DISPATCH) private readonly dispatchQueue: Queue,
  ) {
    super();
  }

  async onModuleInit() {
    this.logger.log('Scheduling Orders domain cron jobs...');
    await this.queue.add(
      CRON_JOBS.AUTO_CANCEL_PENDING,
      {},
      {
        repeat: { pattern: '* * * * *' },
        jobId: CRON_JOBS.AUTO_CANCEL_PENDING,
      },
    );
    await this.queue.add(
      CRON_JOBS.DATA_RETENTION,
      { type: 'orders' },
      { repeat: { pattern: '0 1 * * *' }, jobId: 'cron.data_retention.orders' },
    );
    await this.queue.add(
      CRON_JOBS.DATA_RETENTION,
      { type: 'chats' },
      { repeat: { pattern: '10 1 * * *' }, jobId: 'cron.data_retention.chats' },
    );
    await this.queue.add(
      CRON_JOBS.DATA_RETENTION,
      { type: 'sessions' },
      {
        repeat: { pattern: '30 1 * * *' },
        jobId: 'cron.data_retention.sessions',
      },
    );
    await this.queue.add(
      CRON_JOBS.DATA_RETENTION,
      { type: 'carts' },
      { repeat: { pattern: '40 1 * * *' }, jobId: 'cron.data_retention.carts' },
    );
    await this.queue.add(
      CRON_JOBS.STUCK_ORDER_MONITOR,
      {},
      {
        repeat: { pattern: '*/2 * * * *' },
        jobId: CRON_JOBS.STUCK_ORDER_MONITOR,
      },
    );
    await this.queue.add(
      CRON_JOBS.UNSETTLED_ORDER_MONITOR,
      {},
      {
        repeat: { pattern: '*/5 * * * *' },
        jobId: CRON_JOBS.UNSETTLED_ORDER_MONITOR,
      },
    );
  }

  async process(job: Job): Promise<any> {
    this.logger.debug(`Processing job [${job.name}] id=${job.id}`);

    switch (job.name) {
      case ORDER_JOBS.SETTLE:
        return this.handleSettle(job);
      case ORDER_JOBS.DELIVERY_WATCHDOG:
        return this.handleDeliveryWatchdog(job);
      case CRON_JOBS.AUTO_CANCEL_PENDING:
        return this.handleAutoCancelPendingOrders();
      case CRON_JOBS.DATA_RETENTION:
        switch (job.data.type) {
          case 'orders':
            return this.handleOrdersCleanup();
          case 'chats':
            return this.handleArchivedConversationsCleanup();
          case 'sessions':
            return this.handleExpiredSessionsCleanup();
          case 'carts':
            return this.handleAbandonedCartsCleanup();
          default:
            return { skipped: true };
        }
      case CRON_JOBS.STUCK_ORDER_MONITOR:
        return this.handleStuckOrderMonitor();
      case CRON_JOBS.UNSETTLED_ORDER_MONITOR:
        return this.handleUnsettledOrderMonitor();
      case ORDER_JOBS.CUSTOMER_APPROVAL_TIMEOUT:
        return this.handleCustomerApprovalTimeout(job);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return { ignored: true, reason: 'unknown_job_name' };
    }
  }

  // ─── Settle a delivered order ─────────────────────────────────────────────

  private async handleSettle(
    job: Job<{ orderId: string; orderNumber: string }>,
  ) {
    const { orderId, orderNumber } = job.data;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        type: true,
        status: true,
        vendorId: true,
        driverId: true,
        driverShiftId: true,
        grandTotal: true,
        upfrontAmount: true,
        distanceKm: true,
        deliveryFee: true,
        driverBonusFee: true,
        subtotal: true,
        tax: true,
        paymentMethod: true,
        customerId: true,
        coinsEarned: true,
        coinsUsed: true,
        discount: true,
        vendor: { select: { commissionRate: true, isContracted: true } },
        driver: { select: { tier: true } },
      },
    });

    if (!order) {
      throw new UnrecoverableError(`Order ${orderNumber} not found`);
    }

    if (order.status !== OrderStatus.DELIVERED) {
      this.logger.warn(
        `Settlement skipped for ${orderNumber}: status is ${order.status}`,
      );
      return { skipped: true };
    }

    if (!order.driverId) {
      throw new UnrecoverableError(
        `Order ${orderNumber} has no driver assigned`,
      );
    }

    const settings = await this.platformSettings.getSettings();
    const deliveryCommissionRate = settings.deliveryCommissionRate ?? 2000;

    await this.statisticsService.settleOrder({
      orderId,
      orderNumber,
      orderType: order.type,
      vendorId: order.vendorId,
      driverId: order.driverId,
      driverShiftId: order.driverShiftId,
      grandTotal: Number(order.grandTotal),
      upfrontAmount: Number(order.upfrontAmount),
      distanceKm: Number(order.distanceKm ?? 0),
      driverTier: order.driver?.tier ?? 'GOLD',
      deliveryFee: Number(order.deliveryFee),
      driverBonusFee: Number(order.driverBonusFee),
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      paymentMethod: order.paymentMethod,
      customerId: order.customerId,
      coinsEarned: Number(order.coinsEarned),
      coinsUsed: Number(order.coinsUsed),
      discount: Number(order.discount),
      commissionRate: order.vendor ? Number(order.vendor.commissionRate) : 0,
      deliveryCommissionRate,
      isContracted: order.vendor ? order.vendor.isContracted : false,
    });

    this.logger.log(`Order ${orderNumber} settled`);
    return { settled: true };
  }

  // ─── Detect stuck in-progress orders ─────────────────────────────────────

  private async handleDeliveryWatchdog(
    job: Job<{ orderId: string; orderNumber: string }>,
  ) {
    const { orderId, orderNumber } = job.data;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, pickedUpAt: true },
    });

    if (
      !order ||
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED
    ) {
      return { skipped: true };
    }

    if (order.pickedUpAt) {
      const hoursElapsed =
        (Date.now() - order.pickedUpAt.getTime()) / (1000 * 60 * 60);
      if (hoursElapsed > 3) {
        this.logger.error(
          `⚠️  WATCHDOG: Order ${orderNumber} picked up ${hoursElapsed.toFixed(1)}h ago — not delivered`,
        );
        // TODO: emit admin alert event
      }
    }

    return { checked: true };
  }

  // ─── CRON Jobs ────────────────────────────────────────────────────────────

  private async handleAutoCancelPendingOrders(): Promise<void> {
    try {
      const settings = await this.platformSettings.getSettings();
      const cutoff = new Date(
        Date.now() - settings.autoCancelPendingMins * 60 * 1000,
      );

      const staleOrders = await this.prisma.order.findMany({
        where: {
          status: OrderStatus.PENDING,
          deletedAt: null,
          createdAt: { lt: cutoff },
        },
        select: { id: true, orderNumber: true },
      });

      if (staleOrders.length === 0) return;

      const cancelPromises = staleOrders.map((order) =>
        this.ordersService.cancelOrder(
          null, // system actor
          order.id,
          `Auto-cancelled: pending for more than ${settings.autoCancelPendingMins} minutes`,
        )
      );

      await Promise.allSettled(cancelPromises);

      this.logger.log(`⏰ Auto-cancelled ${staleOrders.length} pending orders`);
    } catch (error) {
      this.logger.error(
        'Failed to auto-cancel pending orders',
        (error as Error).stack,
      );
    }
  }

  private async handleOrdersCleanup(): Promise<void> {
    try {
      const settings = await this.platformSettings.getSettings();
      const cutoff = new Date(
        Date.now() - settings.retentionOrdersDays * 24 * 60 * 60 * 1000,
      );

      const result = await this.prisma.order.deleteMany({
        where: {
          status: { in: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] },
          updatedAt: { lt: cutoff },
        },
      });

      if (result.count > 0) {
        this.logger.log(`🗑️  Hard-deleted ${result.count} old orders`);
      }
    } catch (error) {
      this.logger.error('Failed to run orders cleanup', (error as Error).stack);
    }
  }

  private async handleArchivedConversationsCleanup(): Promise<void> {
    try {
      const settings = await this.platformSettings.getSettings();
      const cutoff = new Date(
        Date.now() - settings.retentionArchivedChatsDays * 24 * 60 * 60 * 1000,
      );

      const result = await this.prisma.conversation.deleteMany({
        where: {
          status: 'ARCHIVED',
          updatedAt: { lt: cutoff },
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `🗑️  Hard-deleted ${result.count} archived conversations`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to run archived conversations cleanup',
        (error as Error).stack,
      );
    }
  }

  private async handleExpiredSessionsCleanup(): Promise<void> {
    try {
      const settings = await this.platformSettings.getSettings();
      const cutoff = new Date(
        Date.now() -
          settings.retentionExpiredSessionsDays * 24 * 60 * 60 * 1000,
      );

      const result = await this.prisma.session.deleteMany({
        where: {
          expiresAt: { lt: cutoff },
        },
      });

      if (result.count > 0) {
        this.logger.log(`🗑️  Hard-deleted ${result.count} expired sessions`);
      }
    } catch (error) {
      this.logger.error(
        'Failed to run expired sessions cleanup',
        (error as Error).stack,
      );
    }
  }

  private async handleAbandonedCartsCleanup(): Promise<void> {
    try {
      const settings = await this.platformSettings.getSettings();
      const cutoff = new Date(
        Date.now() - settings.retentionAbandonedCartsDays * 24 * 60 * 60 * 1000,
      );

      const result = await this.prisma.cart.deleteMany({
        where: {
          updatedAt: { lt: cutoff },
        },
      });

      if (result.count > 0) {
        this.logger.log(`🗑️  Hard-deleted ${result.count} abandoned carts`);
      }
    } catch (error) {
      this.logger.error(
        'Failed to run abandoned carts cleanup',
        (error as Error).stack,
      );
    }
  }

  // ─── Stuck Order Monitor ──────────────────────────────────────────────────
  private async handleStuckOrderMonitor() {
    this.logger.debug('Running stuck order monitor...');

    // Find orders stuck in LOOKING_FOR_DRIVER or ACCEPTED for more than 5 minutes
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);

    const stuckOrders = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.LOOKING_FOR_DRIVER, OrderStatus.ACCEPTED] },
        updatedAt: { lt: cutoff },
      },
      select: { id: true, orderNumber: true, vendorId: true, type: true },
      take: 100, // Chunked for scalability
    });

    if (stuckOrders.length === 0) return { count: 0 };

    this.logger.warn(
      `Found ${stuckOrders.length} stuck orders. Re-queueing dispatch...`,
    );

    let recovered = 0;
    for (const order of stuckOrders) {
      // Create a dispatch job for the order again
      await this.dispatchQueue.add(
        ORDER_JOBS.DISPATCH,
        { orderId: order.id, orderNumber: order.orderNumber, attempt: 1 },
        { removeOnComplete: true, removeOnFail: 100 },
      );
      recovered++;
    }

    return { recovered };
  }

  private async handleUnsettledOrderMonitor() {
    this.logger.debug('Running unsettled order monitor...');

    // Find orders stuck in DELIVERED without driver/vendor settlement for more than 5 minutes
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);

    // We query orders that are DELIVERED, and check if they have any driverWalletTransactions.
    // To do this efficiently, we query orders that are DELIVERED and updated before cutoff.
    const deliveredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        updatedAt: { lt: cutoff },
      },
      select: { id: true, orderNumber: true, vendorId: true, driverId: true },
      take: 100,
    });

    if (deliveredOrders.length === 0) return { count: 0 };

    let recovered = 0;
    for (const order of deliveredOrders) {
      if (!order.driverId) continue; // Requires driver for driver settlement logic

      const hasSettlement = await this.prisma.driverWalletTransaction.findFirst({
        where: { orderId: order.id, type: 'DELIVERY_FEE' },
      });

      if (!hasSettlement) {
        this.logger.warn(`Found unsettled delivered order ${order.orderNumber}. Re-queueing SETTLE...`);
        await this.queue.add(
          ORDER_JOBS.SETTLE,
          { orderId: order.id, orderNumber: order.orderNumber },
          { attempts: 3, backoff: { type: 'exponential', delay: 5_000 } },
        );
        recovered++;
      }
    }

    return { recovered };
  }
  async handleCustomerApprovalTimeout(job: Job) {
    const { orderId } = job.data;
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { selectedOptions: true } } }
    });
    if (!order || order.status !== 'PENDING_CUSTOMER_APPROVAL') return { skipped: true };

    // 1. Cancel the order (pass null for system actor, and orderId as second argument)
    await this.ordersService.cancelOrder(
      null,
      orderId,
      'Customer did not approve the final fee in time.'
    );

    // 2. Rebuild the cart
    await this.cartService.rebuildCartFromOrder(order);

    this.logger.log(`Order ${orderId} cancelled due to customer approval timeout. Cart rebuilt.`);
    return { success: true };
  }

}
