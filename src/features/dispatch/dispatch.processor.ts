import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue, UnrecoverableError } from 'bullmq';
import { Logger } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { OrdersService } from '../orders/orders.service';
import { OrdersRepository } from '../orders/orders.repository';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  QUEUES,
  ORDER_JOBS,
} from '../../infrastructure/queue/queues.constants';
import { OrderStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTS } from 'src/common/events/event-names';
import { OrderStatusChangedEvent } from 'src/common/events';

@Processor(QUEUES.DISPATCH, { concurrency: 50 })
export class DispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(DispatchProcessor.name);

  constructor(
    private readonly dispatchService: DispatchService,
    private readonly ordersService: OrdersService,
    private readonly ordersRepository: OrdersRepository,
    private readonly platformSettings: PlatformSettingsService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue(QUEUES.DISPATCH) private readonly queue: Queue,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.debug(`Processing dispatch job ${job.name} (id: ${job.id})`);

    switch (job.name) {
      case ORDER_JOBS.DISPATCH:
        return this.handleDispatch(job);
      case ORDER_JOBS.DISPATCH_EXPIRE:
        return this.handleDispatchExpire(job);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return { ignored: true, reason: 'unknown_job_name' };
    }
  }

  // ─── Find nearest driver and dispatch ────────────────────────────────────

  private async handleDispatch(
    job: Job<{
      orderId: string;
      orderNumber: string;
      attempt: number;
      excludeDriverIds?: string[];
    }>,
  ) {
    const { orderId, orderNumber, attempt, excludeDriverIds = [] } = job.data;

    // Read fresh status each time — never use a snapshot before a write
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });

    if (!order) {
      throw new UnrecoverableError(`Order ${orderNumber} not found`);
    }

    // Only valid entry states for dispatch
    if (
      order.status !== OrderStatus.ACCEPTED &&
      order.status !== OrderStatus.LOOKING_FOR_DRIVER
    ) {
      this.logger.warn(
        `Dispatch skipped for ${orderNumber}: status is ${order.status}`,
      );
      return { skipped: true, status: order.status };
    }

    // Transition to LOOKING_FOR_DRIVER if still ACCEPTED
    if (order.status === OrderStatus.ACCEPTED) {
      await this.ordersRepository.updateStatus(
        orderId,
        OrderStatus.LOOKING_FOR_DRIVER,
        'system',
        'Searching for available driver',
        undefined,
        OrderStatus.ACCEPTED
      );

      const fullOrder = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          vendor: { include: { members: true } },
          driver: true,
        },
      });

      if (fullOrder) {
        this.eventEmitter.emit(
          EVENTS.ORDER_STATUS_CHANGED,
          new OrderStatusChangedEvent(
            fullOrder.id,
            fullOrder.orderNumber,
            OrderStatus.ACCEPTED,
            OrderStatus.LOOKING_FOR_DRIVER,
            fullOrder.customerId,
            fullOrder.customer?.userId || fullOrder.customerId,
            fullOrder.vendorId,
            fullOrder.vendor?.members.map((m: any) => m.userId) || [],
            fullOrder.driverId,
            fullOrder.driver?.userId || null,
            'system',
            'Searching for available driver',
          ),
        );
      }
    }

    let dispatched = false;
    try {
      dispatched = await this.dispatchService.attemptDispatch({
        orderId,
        orderNumber,
        attempt,
        excludeDriverIds,
      });
    } catch (err: any) {
      this.logger.error(`CRITICAL DISPATCH ERROR for ${orderNumber}: ${err.message}`, err.stack);
      throw err; // Re-throw for BullMQ retry
    }

    if (!dispatched) {
      this.logger.warn(
        `No drivers available for ${orderNumber} (attempt ${attempt})`,
      );

      const settings = await this.platformSettings.getSettings();
      const maxAttempts = settings.driverSearchMaxAttempts ?? 5;

      if (attempt >= maxAttempts) {
        this.logger.error(
          `Order ${orderNumber} exhausted ${attempt} dispatch attempts — no drivers found`,
        );

        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
          include: {
            customer: true,
            vendor: { include: { members: true } },
            driver: true,
          },
        });

        await this.ordersService.cancelOrder(
          null, // system actor
          orderId,
          'Auto-cancelled: No drivers available after maximum attempts',
        );

        return { noDriversFound: true, attempts: attempt, autoCancelled: true };
      }

      // Enqueue next attempt manually to ensure 'attempt' increments, triggering dynamic radius expansion
      await this.queue.add(
        ORDER_JOBS.DISPATCH,
        { orderId, orderNumber, attempt: attempt + 1, excludeDriverIds },
        { delay: (settings.driverAcceptTimeoutSecs ?? 30) * 1000 },
      );

      return { noDriversFound: true, retryingNextAttempt: true };
    }

    return { dispatched: true, attempt };
  }

  // ─── Expire a pending dispatch and re-try ─────────────────────────────────

  private async handleDispatchExpire(job: Job) {
    // We delegate the expiry logic to the DispatchService since it requires Redis
    await this.dispatchService.handleExpiry(job.data);
    return { success: true, processedExpiry: true };
  }
}
