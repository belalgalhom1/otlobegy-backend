import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DispatchStatus, NotificationType, OrderStatus } from '@prisma/client';
import { SocketService } from '../../infrastructure/socket/socket.service';
import { NotificationsService } from '../../features/notifications/notifications.service';
import { DispatchService } from '../../features/dispatch/dispatch.service';
import { StatisticsService } from '../../features/statistics/statistics.service';
import { PlatformSettingsService } from '../../features/platform-settings/platform-settings.service';
import { ConversationsService } from '../../features/chat/conversations.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import {
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  OrderCancelledEvent,
  OrderDispatchSentEvent,
  OrderDispatchRespondedEvent,
  OrderDispatchCancelledEvent,
  OrderSettledEvent,
  OrderPaymentStatusChangedEvent,
} from '../events';
import { EVENTS } from '../events/event-names';
import {
  QUEUES,
  ORDER_JOBS,
} from '../../infrastructure/queue/queues.constants';

const WS = {
  ORDER_NEW: 'order.new',
  ORDER_STATUS: 'order.status',
  ORDER_CANCELLED: 'order.cancelled',
  DISPATCH_INCOMING: 'dispatch.incoming',
  DISPATCH_CANCELLED: 'dispatch.cancelled',
} as const;

@Injectable()
export class OrderListener {
  private readonly logger = new Logger(OrderListener.name);

  constructor(
    private readonly socketService: SocketService,
    private readonly notificationsService: NotificationsService,
    private readonly dispatchService: DispatchService,
    private readonly statisticsService: StatisticsService,
    private readonly platformSettings: PlatformSettingsService,
    private readonly conversationsService: ConversationsService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @InjectQueue(QUEUES.ORDERS) private readonly ordersQueue: Queue,
    @InjectQueue(QUEUES.DISPATCH) private readonly dispatchQueue: Queue,
  ) {}

  // ─── Order created ────────────────────────────────────────────────────────

  @OnEvent(EVENTS.ORDER_CREATED)
  async handleOrderCreated(event: OrderCreatedEvent) {
    const idempotencyKey = `notify:order_created:${event.orderId}`;
    const isNew = await this.redis.getClient().set(idempotencyKey, '1', 'EX', 14400, 'NX');
    if (!isNew) {
      this.logger.debug(`Skipping duplicate order created event for ${event.orderNumber}`);
      return;
    }
    
    this.logger.log(`Order created: ${event.orderNumber}`);

    // Notify all vendor members via WS + push
    const notificationPayloads = event.vendorUserIds.map((uid) => ({
      userId: uid,
      title: 'New Order Received',
      titleAr: 'طلب جديد',
      body: `Order ${event.orderNumber} — ${event.grandTotal} EGP`,
      bodyAr: `طلب ${event.orderNumber} — ${event.grandTotal} جنيه`,
      type: NotificationType.ORDER_UPDATE,
      data: { orderId: event.orderId, orderNumber: event.orderNumber },
    }));

    // Fire-and-forget
    event.vendorUserIds.forEach((uid) => {
      this.socketService
        .emitToUser(uid, WS.ORDER_NEW, {
          orderId: event.orderId,
          orderNumber: event.orderNumber,
          grandTotal: event.grandTotal,
          paymentMethod: event.paymentMethod,
        })
        .catch((err: unknown) =>
          this.logger.error(
            `Failed to emit WS.ORDER_NEW for user ${uid}: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
    });

    this.notificationsService
      .createMany(notificationPayloads)
      .catch((err: unknown) =>
        this.logger.error(
          `Failed to create notifications for new order ${event.orderNumber}: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );

    // If it's a custom order (no vendor), it goes directly to dispatch since there is no vendor to accept it
    if (event.orderType === 'RIDE' || event.orderType === 'CUSTOM_DELIVERY') {
      await this.dispatchQueue.add(
        ORDER_JOBS.DISPATCH,
        { orderId: event.orderId, orderNumber: event.orderNumber, attempt: 1 },
        { delay: 500, attempts: 5, backoff: { type: 'fixed', delay: 60_000 } },
      );
    }
  }

  // ─── Order payment status changed (Mobile Wallet) ─────────────────────────

  @OnEvent(EVENTS.ORDER_PAYMENT_STATUS_CHANGED)
  async handleOrderPaymentStatusChanged(event: OrderPaymentStatusChangedEvent) {
    this.logger.log(
      `Order ${event.orderNumber} payment status: ${event.paymentStatus}`,
    );

    const socketPayload = {
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      paymentStatus: event.paymentStatus,
      message: event.message,
    };

    const notifyUserIds = new Set<string>([
      event.customerUserId,
      ...event.vendorUserIds,
    ]);
    if (event.driverUserId) notifyUserIds.add(event.driverUserId);

    // Fire-and-forget
    notifyUserIds.forEach((uid) => {
      this.socketService
        .emitToUser(uid, WS.ORDER_STATUS, socketPayload)
        .catch((err: unknown) =>
          this.logger.error(
            `Failed to emit WS.ORDER_STATUS for user ${uid}: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
    });
  }

  // ─── Order status changed ─────────────────────────────────────────────────

  @OnEvent(EVENTS.ORDER_STATUS_CHANGED)
  async handleOrderStatusChanged(event: OrderStatusChangedEvent) {
    const idempotencyKey = `notify:order_status:${event.orderId}:${event.newStatus}`;
    const isNew = await this.redis.getClient().set(idempotencyKey, '1', 'EX', 14400, 'NX');
    if (!isNew) {
      this.logger.debug(`Skipping duplicate order status event for ${event.orderNumber} to ${event.newStatus}`);
      return;
    }

    this.logger.log(
      `Order ${event.orderNumber}: ${event.oldStatus} -> ${event.newStatus}`,
    );

    const socketPayload = {
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      oldStatus: event.oldStatus,
      newStatus: event.newStatus,
      note: event.note,
    };

    // Collect all user IDs that need real-time update
    const notifyUserIds = new Set<string>([
      event.customerUserId,
      ...event.vendorUserIds,
    ]);
    if (event.driverUserId) notifyUserIds.add(event.driverUserId);

    // Fire-and-forget
    notifyUserIds.forEach((uid) => {
      this.socketService
        .emitToUser(uid, WS.ORDER_STATUS, socketPayload)
        .catch((err: unknown) =>
          this.logger.error(
            `Failed to emit WS.ORDER_STATUS for user ${uid}: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
    });

    // Customer push notification for key status changes
    const customerMsg = this.buildCustomerStatusMessage(event.newStatus);
    if (customerMsg) {
      await this.notificationsService
        .create({
          userId: event.customerUserId,
          title: customerMsg.en,
          titleAr: customerMsg.ar,
          body: `Order ${event.orderNumber}`,
          bodyAr: `طلب ${event.orderNumber}`,
          type: NotificationType.ORDER_UPDATE,
          data: {
            orderId: event.orderId,
            orderNumber: event.orderNumber,
            status: event.newStatus,
          },
        })
        .catch((err: unknown) =>
          this.logger.error(
            `Failed to create notification: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
    }

    // Trigger dispatch and chat when vendor accepts order
    if (event.newStatus === OrderStatus.ACCEPTED) {
      const order = await this.prisma.order.findUnique({
        where: { id: event.orderId },
        select: { type: true },
      });

      if (order?.type === 'STANDARD') {
        await this.conversationsService.createSystemOrderConversation(
          event.orderId,
        );
      }

      await this.dispatchQueue.add(
        ORDER_JOBS.DISPATCH,
        { orderId: event.orderId, orderNumber: event.orderNumber, attempt: 1 },
        { delay: 500, attempts: 5, backoff: { type: 'fixed', delay: 60_000 } },
      );
    }

    // Assign driver to chat if they just took the order
    if (
      event.newStatus === OrderStatus.DRIVER_ASSIGNED ||
      event.newStatus === OrderStatus.PENDING_PAYMENT ||
      event.newStatus === OrderStatus.PENDING_CUSTOMER_APPROVAL
    ) {
      const order = await this.prisma.order.findUnique({
        where: { id: event.orderId },
        select: { type: true },
      });

      if (order?.type === 'STANDARD') {
        if (event.driverUserId) {
          await this.conversationsService.addParticipantToOrderConversation(
            event.orderId,
            event.driverUserId,
          );
        }
      } else if (order?.type === 'RIDE' || order?.type === 'CUSTOM_DELIVERY') {
        await this.conversationsService.createSystemOrderConversation(
          event.orderId,
        );
      }
    }

    // Trigger settlement when driver marks delivered
    if (event.newStatus === OrderStatus.DELIVERED) {
      await this.ordersQueue.add(
        ORDER_JOBS.SETTLE,
        { orderId: event.orderId, orderNumber: event.orderNumber },
        { attempts: 3, backoff: { type: 'exponential', delay: 5_000 } },
      );
    }

    if (event.newStatus === OrderStatus.PICKED_UP) {
      // Watchdog: alert if order not confirmed delivered within 3h of pickup
      await this.ordersQueue.add(
        ORDER_JOBS.DELIVERY_WATCHDOG,
        { orderId: event.orderId, orderNumber: event.orderNumber },
        { delay: 3 * 60 * 60 * 1000, jobId: `watchdog-${event.orderId}` },
      );
    }

    // Live Tracking Cache: Maintain driver's active order state in Redis
    if (event.driverUserId && event.driverId) {
      if (
        event.newStatus === OrderStatus.DRIVER_ASSIGNED ||
        event.newStatus === OrderStatus.PREPARING ||
        event.newStatus === OrderStatus.READY_FOR_PICKUP ||
        event.newStatus === OrderStatus.PICKED_UP
      ) {
        await this.redis.set(
          `otlobegy:driver-active-order:${event.driverId}`,
          JSON.stringify({
            orderId: event.orderId,
            customerUserId: event.customerUserId,
          }),
          12 * 60 * 60, // 12 hours TTL as a fallback
        );
      } else if (
        event.newStatus === OrderStatus.DELIVERED ||
        event.newStatus === OrderStatus.CANCELLED
      ) {
        await this.redis.del(`otlobegy:driver-active-order:${event.driverId}`);
      }
    }
  }

  // ─── Order cancelled ──────────────────────────────────────────────────────

  @OnEvent(EVENTS.ORDER_CANCELLED)
  async handleOrderCancelled(event: OrderCancelledEvent) {
    this.logger.log(`Order cancelled: ${event.orderNumber} — ${event.reason}`);

    const socketPayload = {
      orderId: event.orderId,
      orderNumber: event.orderNumber,
      reason: event.reason,
    };

    const notifyUserIds = new Set<string>([
      event.customerUserId,
      ...event.vendorUserIds,
    ]);
    if (event.driverUserId) notifyUserIds.add(event.driverUserId);

    // Fire-and-forget
    notifyUserIds.forEach((uid) => {
      this.socketService
        .emitToUser(uid, WS.ORDER_CANCELLED, socketPayload)
        .catch((err: unknown) =>
          this.logger.error(
            `Failed to emit WS.ORDER_CANCELLED for user ${uid}: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );

      // Also emit ORDER_STATUS because frontend apps expect 'order.status' for state changes
      this.socketService
        .emitToUser(uid, WS.ORDER_STATUS, {
          orderId: event.orderId,
          orderNumber: event.orderNumber,
          status: 'CANCELLED',
          newStatus: 'CANCELLED',
          reason: event.reason,
        })
        .catch(() => {});
    });

    // Notify customer via push
    this.notificationsService
      .create({
        userId: event.customerUserId,
        title: 'Order Cancelled',
        titleAr: 'تم إلغاء الطلب',
        body: event.reason,
        bodyAr: event.reason,
        type: NotificationType.ORDER_UPDATE,
        data: { orderId: event.orderId, orderNumber: event.orderNumber },
      })
      .catch((err: unknown) =>
        this.logger.error(
          `Failed to create notification for cancelled order ${event.orderNumber}: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );

    // Update stats
    await this.statisticsService
      .recordCancellation(event.vendorId, event.driverId)
      .catch((err: unknown) =>
        this.logger.error(
          `Failed to record cancellation stat: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
  }

  // ─── Dispatch sent ────────────────────────────────────────────────────────

  @OnEvent(EVENTS.ORDER_DISPATCH_SENT)
  async handleDispatchSent(event: OrderDispatchSentEvent) {
    this.logger.log(
      `Dispatch sent to driver ${event.driverId} for order ${event.orderNumber}`,
    );

    // Real-time ping + push to driver
    // Fire-and-forget
    this.socketService
      .emitToUser(event.driverUserId, WS.DISPATCH_INCOMING, {
        dispatchId: event.dispatchId,
        orderId: event.orderId,
        orderNumber: event.orderNumber,
        type: event.type,
        estimatedEarnings: event.estimatedEarnings,
        distanceKm: event.distanceKm,
        expiresAt: event.expiresAt,
        pickupLocationName: event.pickupLocationName,
        dropoffLocationName: event.dropoffLocationName,
      })
      .catch((err: unknown) =>
        this.logger.error(
          `Failed to emit WS.DISPATCH_INCOMING for driver ${event.driverUserId}: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );

    this.notificationsService
      .create({
        userId: event.driverUserId,
        title: 'New Delivery Request',
        titleAr: 'طلب توصيل جديد',
        body: `Order ${event.orderNumber} — ${event.distanceKm.toFixed(1)}km`,
        bodyAr: `طلب ${event.orderNumber} — ${event.distanceKm.toFixed(1)} كم`,
        type: NotificationType.ORDER_UPDATE,
        data: {
          dispatchId: event.dispatchId,
          orderId: event.orderId,
          type: 'DISPATCH',
        },
      })
      .catch((err: unknown) =>
        this.logger.error(
          `Failed to create dispatch notification for driver ${event.driverUserId}: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );

    // Expiry job is already created in dispatch.service.ts with the proper full payload.

    await this.statisticsService
      .recordDispatchSent(event.driverId)
      .catch(() => {});
  }

  // ─── Dispatch cancelled ───────────────────────────────────────────────────

  @OnEvent(EVENTS.ORDER_DISPATCH_CANCELLED)
  async handleDispatchCancelled(event: OrderDispatchCancelledEvent) {
    this.logger.log(
      `Dispatch cancelled for driver ${event.driverUserId} on order ${event.orderId}`,
    );

    // Fire-and-forget
    this.socketService
      .emitToUser(event.driverUserId, WS.DISPATCH_CANCELLED, {
        dispatchId: event.dispatchId,
        orderId: event.orderId,
      })
      .catch((err: unknown) =>
        this.logger.error(
          `Failed to emit WS.DISPATCH_CANCELLED for driver ${event.driverUserId}: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
  }

  // ─── Dispatch responded ───────────────────────────────────────────────────

  @OnEvent(EVENTS.ORDER_DISPATCH_RESPONDED)
  async handleDispatchResponded(event: OrderDispatchRespondedEvent) {
    this.logger.log(
      `Dispatch ${event.dispatchId} responded: ${event.status} by driver ${event.driverId}`,
    );

    if (event.status === DispatchStatus.ACCEPTED) {
      // Cancel the expiry job ONLY when accepted
      const expiryJob = await this.dispatchQueue.getJob(
        `dispatch-expire-${event.dispatchId}`,
      );
      if (expiryJob) await expiryJob.remove();

      await this.statisticsService
        .recordDispatchAccepted(event.driverId)
        .catch(() => {});
    } else if (event.status === DispatchStatus.REJECTED) {
      await this.dispatchService.handleRejection(
        event.dispatchId,
        event.driverId,
      );
      await this.statisticsService
        .recordDispatchRejected(event.driverId)
        .catch(() => {});
    } else if (event.status === DispatchStatus.EXPIRED) {
      await this.statisticsService
        .recordDispatchExpired(event.driverId)
        .catch(() => {});
    }
  }

  // ─── Order settled ────────────────────────────────────────────────────────

  @OnEvent(EVENTS.ORDER_SETTLED)
  handleOrderSettled(event: OrderSettledEvent) {
    this.logger.log(`Order ${event.orderNumber} settled — settlement complete`);
    // Future: send receipt notification to customer, update vendor dashboard
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private buildCustomerStatusMessage(
    status: OrderStatus,
  ): { en: string; ar: string } | null {
    const messages: Partial<Record<OrderStatus, { en: string; ar: string }>> = {
      [OrderStatus.ACCEPTED]: {
        en: 'Your order was accepted!',
        ar: 'تم قبول طلبك!',
      },
      [OrderStatus.PENDING_CUSTOMER_APPROVAL]: {
        en: 'Driver found! Please approve the exact delivery fee.',
        ar: 'تم العثور على سائق! يرجى الموافقة على رسوم التوصيل النهائية.',
      },
      [OrderStatus.PREPARING]: {
        en: 'Your order is being prepared',
        ar: 'جاري تحضير طلبك',
      },
      [OrderStatus.READY_FOR_PICKUP]: {
        en: 'Your order is ready',
        ar: 'طلبك جاهز',
      },
      [OrderStatus.DRIVER_ASSIGNED]: {
        en: 'A driver is on the way',
        ar: 'السائق في الطريق إليك',
      },
      [OrderStatus.PICKED_UP]: {
        en: 'Your order has been picked up',
        ar: 'تم استلام طلبك',
      },
      [OrderStatus.DELIVERED]: {
        en: 'Your order was delivered!',
        ar: 'تم توصيل طلبك!',
      },
    };
    return messages[status] ?? null;
  }
}
