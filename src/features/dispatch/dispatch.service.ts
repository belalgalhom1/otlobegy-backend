import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { QUEUES, ORDER_JOBS } from '../../infrastructure/queue/queues.constants';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { OrderDispatchSentEvent, OrderDispatchCancelledEvent } from 'src/common/events';
import { EVENTS } from 'src/common/events/event-names';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { LocationRepository } from '../../infrastructure/location/location.repository';
import { OrderStatusChangedEvent } from 'src/common/events';

import { OrderErrors } from 'src/common/constants/response.constants';

export interface DispatchAttemptPayload {
  orderId: string;
  orderNumber: string;
  attempt: number;
  excludeDriverIds?: string[];
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly platformSettings: PlatformSettingsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly locationRepository: LocationRepository,
    @InjectQueue(QUEUES.DISPATCH) private readonly dispatchQueue: Queue,
    @InjectQueue(QUEUES.ORDERS) private readonly ordersQueue: Queue,
  ) {}

  // ─── Core dispatch logic ──────────────────────────────────────────────────

  async attemptDispatch(payload: DispatchAttemptPayload): Promise<boolean> {
    const { orderId, orderNumber, attempt, excludeDriverIds = [] } = payload;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { 
        id: true, 
        status: true, 
        vendorId: true, 
        type: true,
        deliveryFee: true,
        customer: { select: { user: { select: { name: true } } } },
        vendor: { select: { storeName: true, storeNameAr: true } }
      },
    });

    if (!order || order.status !== OrderStatus.LOOKING_FOR_DRIVER) {
      this.logger.warn(
        `Dispatch skipped for ${orderNumber}: status is ${order?.status ?? 'not found'}`,
      );
      return false;
    }

    const dispatchContext =
      await this.locationRepository.getOrderLocationContext(orderId);
    if (!dispatchContext) {
      this.logger.error(
        `No dispatch context (location) found for order ${orderNumber}`,
      );
      return false;
    }

    const settings = await this.platformSettings.getSettings();

    // Dynamic Radius Expansion
    let radiusKm =
      settings.driverSearchRadiusKm +
      settings.driverSearchRadiusStepKm * (attempt - 1);
    if (radiusKm > settings.driverSearchRadiusMaxKm) {
      radiusKm = settings.driverSearchRadiusMaxKm;
    }

    const timeoutSecs = settings.driverAcceptTimeoutSecs;
    const batchSize = settings.maxDispatchBatchSize ?? 3;

    const orderDistanceKm = await this.locationRepository.getDistanceKm(
      dispatchContext.lng,
      dispatchContext.lat,
      dispatchContext.deliveryLng,
      dispatchContext.deliveryLat,
    );

    let allowedVehicleTypes: string[] = [];
    if (dispatchContext.requestedVehicleType) {
      const v = dispatchContext.requestedVehicleType;
      const isAllowed = 
        (v === 'BICYCLE' && settings.allowBicycle) ||
        (v === 'MOTORCYCLE' && settings.allowMotorcycle) ||
        (v === 'CAR' && settings.allowCar) ||
        (v === 'VAN' && settings.allowVan) ||
        (v === 'TRUCK' && settings.allowTruck) ||
        (v === 'MOTOR_TRICYCLE' && settings.allowMotorTricycle);
      if (isAllowed) allowedVehicleTypes = [v];
    } else if (order.type === 'STANDARD') {
      if (settings.allowMotorcycle) allowedVehicleTypes.push('MOTORCYCLE');
      if (settings.allowBicycle && orderDistanceKm <= (settings.maxKmForBicycle ?? 5.0)) {
        allowedVehicleTypes.push('BICYCLE');
      }
      if (settings.allowCar) allowedVehicleTypes.push('CAR');
      if (settings.allowVan) allowedVehicleTypes.push('VAN');
      if (settings.allowTruck) allowedVehicleTypes.push('TRUCK');
      if (settings.allowMotorTricycle) allowedVehicleTypes.push('MOTOR_TRICYCLE');
    }

    const requireActiveShift =
      settings.driverShiftsEnabled && order.type === 'STANDARD';

    if (allowedVehicleTypes.length === 0) {
      this.logger.warn(`No allowed vehicle types for order ${orderNumber}. Dispatch aborted.`);
      return false;
    }

    const nearbyDrivers = await this.locationRepository.findNearbyDrivers(
      dispatchContext.lng,
      dispatchContext.lat,
      radiusKm,
      excludeDriverIds,
      allowedVehicleTypes,
      requireActiveShift,
    );

    if (nearbyDrivers.length === 0) {
      this.logger.warn(
        `No available drivers within ${radiusKm}km for order ${orderNumber} (attempt ${attempt})`,
      );
      return false;
    }

    const selectedDrivers = nearbyDrivers.slice(0, batchSize);

    let perKmOverride: number | null = null;
    if (dispatchContext.requestedVehicleType) {
      perKmOverride = await this.platformSettings.getVehiclePerKm(
        dispatchContext.requestedVehicleType,
      );
    }

    const dispatchId = uuidv4();
    const expiresAt = new Date(Date.now() + timeoutSecs * 1000);

    const candidates = await Promise.all(
      selectedDrivers.map(async (candidate) => {
        const totalDistanceKm = candidate.distanceKm + orderDistanceKm;
        const estimatedEarnings = await this.calculateEstimatedEarnings(
          totalDistanceKm,
          perKmOverride,
          settings,
        );
        
        const pickupLocationName = order.vendor?.storeName ?? order.vendor?.storeNameAr ?? 'Vendor';
        const dropoffLocationName = order.customer?.user?.name ?? 'Customer';

        return {
          driverId: candidate.id,
          userId: candidate.userId,
          driverShiftId: candidate.activeShiftId,
          distanceKm: candidate.distanceKm,
          estimatedEarnings,
          pickupLocationName,
          dropoffLocationName,
        };
      }),
    );

    const dispatchData = {
      dispatchId,
      orderId,
      type: order.type,
      candidates,
      expiresAt: expiresAt.toISOString(),
      pickupLocationName: candidates[0]?.pickupLocationName,
      dropoffLocationName: candidates[0]?.dropoffLocationName,
    };

    // Store in Redis with extended TTL to outlive BullMQ delay
    const redisTtl = timeoutSecs + 300; // 5 extra minutes
    await this.redis.set(
      `otlobegy:dispatch:${dispatchId}`,
      JSON.stringify(dispatchData),
      redisTtl,
    );

    // Also track which driver holds the active dispatch for this order
    await this.redis.set(
      `otlobegy:order-dispatch-active:${orderId}`,
      dispatchId,
      redisTtl,
    );

    // Prepare exclude list for next attempt if this one expires
    const newExcludeDriverIds = [
      ...excludeDriverIds,
      ...candidates.map((c) => c.driverId),
    ];

    // Schedule the expiry watchdog
    await this.dispatchQueue.add(
      ORDER_JOBS.DISPATCH_EXPIRE,
      {
        dispatchId,
        orderId,
        orderNumber,
        attempt,
        excludeDriverIds: newExcludeDriverIds,
      },
      { delay: timeoutSecs * 1000, jobId: `dispatch-expire-${dispatchId}` },
    );

    for (const candidate of candidates) {
      this.eventEmitter.emit(
        EVENTS.ORDER_DISPATCH_SENT,
        new OrderDispatchSentEvent(
          dispatchId,
          orderId,
          orderNumber,
          candidate.driverId,
          candidate.userId,
          order.type,
          candidate.estimatedEarnings,
          candidate.distanceKm,
          expiresAt,
          candidate.pickupLocationName,
          candidate.dropoffLocationName,
        ),
      );
    }

    this.logger.log(
      `Broadcast sent to ${candidates.length} drivers for order ${orderNumber} ` +
        `(radius: ${radiusKm}km, attempt ${attempt})`,
    );

    return true;
  }

  // ─── Handle dispatch expiry ───────────────────────────────────────────────

  async handleExpiry(payload: {
    dispatchId: string;
    orderId: string;
    orderNumber: string;
    attempt: number;
    excludeDriverIds: string[];
  }): Promise<void> {
    const { dispatchId, orderId, orderNumber, attempt, excludeDriverIds } =
      payload;

    // Check if the dispatch is still active in Redis
    const active = await this.redis.get(`otlobegy:dispatch:${dispatchId}`);
    if (!active) {
      // It was already responded to (accepted or rejected)
      return;
    }

    // It is truly expired. Clean up Redis.
    await this.redis.del(`otlobegy:dispatch:${dispatchId}`);
    await this.redis.del(`otlobegy:order-dispatch-active:${orderId}`);
    const rejectedKey = `otlobegy:dispatch:${dispatchId}:rejected`;
    const rejectedBy: string[] = await this.redis.smembers(rejectedKey);
    await this.redis.del(rejectedKey);

    // Persist terminal state to Postgres for anyone who didn't reject
    const dispatchData = JSON.parse(active);
    const candidates = dispatchData.candidates || [];

    const unresponded = candidates.filter(
      (c: any) => !rejectedBy.includes(c.driverId),
    );

    if (unresponded.length > 0) {
      await this.prisma.orderDispatch.createMany({
        data: unresponded.map((candidate: any) => ({
          id: uuidv4(),
          orderId,
          driverId: candidate.driverId,
          driverShiftId: candidate.driverShiftId,
          type: dispatchData.type,
          distanceKm: candidate.distanceKm,
          estimatedEarnings: candidate.estimatedEarnings,
          status: 'EXPIRED',
          expiresAt: new Date(dispatchData.expiresAt),
        })),
      });

      // Increment expired dispatches count on driver shifts
      const shiftIds = unresponded
        .map((c: any) => c.driverShiftId)
        .filter((id: any) => id != null);
      if (shiftIds.length > 0) {
        await this.prisma.driverShift.updateMany({
          where: { id: { in: shiftIds } },
          data: { expiredDispatches: { increment: 1 } },
        });
      }

      // Notify unresponded drivers that the dispatch has expired/cancelled
      for (const candidate of unresponded) {
        this.eventEmitter.emit(
          EVENTS.ORDER_DISPATCH_CANCELLED,
          new OrderDispatchCancelledEvent(
            dispatchId,
            orderId,
            candidate.userId,
          ),
        );
      }
    }

    this.logger.log(
      `Dispatch ${dispatchId} expired — retrying for order ${orderId} (attempt ${attempt + 1})`,
    );

    // Add back to queue for next attempt
    await this.dispatchQueue.add(ORDER_JOBS.DISPATCH, {
      orderId,
      orderNumber,
      attempt: attempt + 1,
      excludeDriverIds,
    });
  }

  // ─── Handle acceptance ────────────────────────────────────────────────────

  async handleAcceptance(dispatchId: string, driverId: string): Promise<void> {
    const raw = await this.redis.get(`otlobegy:dispatch:${dispatchId}`);
    if (!raw) {
      this.logger.warn(
        `Driver ${driverId} attempted to accept expired dispatch ${dispatchId}`,
      );
      return;
    }

    const dispatchData = JSON.parse(raw);
    
    // Strict timestamp validation since Redis TTL outlives the dispatch window
    if (Date.now() > new Date(dispatchData.expiresAt).getTime()) {
      this.logger.warn(
        `Driver ${driverId} attempted to accept dispatch ${dispatchId} but it is past expiresAt timestamp`,
      );
      return;
    }

    const orderId = dispatchData.orderId;
    const candidate = (dispatchData.candidates || []).find(
      (c: any) => c.driverId === driverId,
    );

    if (!candidate) {
      this.logger.warn(
        `Driver ${driverId} not found in dispatch ${dispatchId}`,
      );
      return;
    }

    const rejectedKey = `otlobegy:dispatch:${dispatchId}:rejected`;
    const rejectedBy = await this.redis.smembers(rejectedKey);

    if (rejectedBy.includes(driverId)) {
      this.logger.warn(
        `Driver ${driverId} already rejected dispatch ${dispatchId} but tried to accept.`,
      );
      throw new Error(OrderErrors.ALREADY_ASSIGNED_OR_CANCELLED);
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { userId: true } },
        vendor: { select: { members: { select: { userId: true } } } }
      }
    });

    if (!order || order.status !== OrderStatus.LOOKING_FOR_DRIVER) return;

    const dispatchContext =
      await this.locationRepository.getOrderLocationContext(order.id);
    if (!dispatchContext) return;

    const orderDistanceKm = await this.locationRepository.getDistanceKm(
      dispatchContext.lng,
      dispatchContext.lat,
      dispatchContext.deliveryLng,
      dispatchContext.deliveryLat,
    );

    const totalDistanceKm = Number(candidate.distanceKm) + orderDistanceKm;

    let perKmOverride: number | null = null;
    if (dispatchContext.requestedVehicleType) {
      perKmOverride = await this.platformSettings.getVehiclePerKm(
        dispatchContext.requestedVehicleType,
      );
    }

    let zoneBaseOverride: number | null = null;
    if (order.zoneId) {
      const zone = await this.prisma.zone.findUnique({
        where: { id: order.zoneId },
        select: { baseDeliveryFeeOverride: true },
      });
      if (zone && zone.baseDeliveryFeeOverride)
        zoneBaseOverride = Number(zone.baseDeliveryFeeOverride);
    }

    const finalDeliveryFee = await this.platformSettings.calculateDeliveryFee(
      totalDistanceKm,
      zoneBaseOverride,
      perKmOverride,
    );

    const feeDifference = finalDeliveryFee - Number(order.deliveryFee);
    const newGrandTotal = Number(order.grandTotal) + feeDifference;
    const settings = await this.platformSettings.getSettings();
    const requiresCustomerApproval = (settings as any).requireCustomerApproval ?? true;
    const nextStatus = requiresCustomerApproval ? OrderStatus.PENDING_CUSTOMER_APPROVAL : (order.paymentMethod === 'MOBILE_WALLET' ? OrderStatus.PENDING_PAYMENT : OrderStatus.DRIVER_ASSIGNED);

    await this.prisma.$transaction(async (tx) => {
      // 1. Create the permanent accepted record
      await tx.orderDispatch.create({
        data: {
          id: dispatchId, // Keep original dispatchId for the accepted one
          orderId,
          driverId,
          driverShiftId: candidate.driverShiftId,
          type: dispatchData.type,
          distanceKm: candidate.distanceKm,
          estimatedEarnings: candidate.estimatedEarnings,
          status: 'ACCEPTED',
          expiresAt: new Date(dispatchData.expiresAt),
        },
      });

      

            // 2. Assign the order safely to prevent race conditions
      const updated = await tx.order.updateMany({
        where: { id: order.id, status: OrderStatus.LOOKING_FOR_DRIVER },
        data: {
          driverId,
          driverShiftId: candidate.driverShiftId,
          status: nextStatus,
          driverAssignedAt: new Date(),
          deliveryFee: finalDeliveryFee,
          grandTotal: newGrandTotal,
        },
      });

      if (updated.count === 0) {
        throw new Error(OrderErrors.ALREADY_ASSIGNED_OR_CANCELLED);
      }

      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          status: nextStatus,
          note: `Driver assigned. ${nextStatus === OrderStatus.PENDING_PAYMENT ? 'Awaiting mobile wallet payment.' : ''}`,
          createdBy: 'system',
        },
      });

      await tx.driver.update({
        where: { id: driverId },
        data: { status: 'ON_DELIVERY' },
      });

      // 3. Log CANCELLED for the remaining "losing" candidates
      const losingCandidates = (dispatchData.candidates || []).filter(
        (c: any) => c.driverId !== driverId && !rejectedBy.includes(c.driverId),
      );

      if (losingCandidates.length > 0) {
        await tx.orderDispatch.createMany({
          data: losingCandidates.map((c: any) => ({
            id: uuidv4(),
            orderId,
            driverId: c.driverId,
            driverShiftId: c.driverShiftId,
            type: dispatchData.type,
            distanceKm: c.distanceKm,
            estimatedEarnings: c.estimatedEarnings,
            status: 'CANCELLED',
            expiresAt: new Date(dispatchData.expiresAt),
          })),
        });
      }
    });

    // Cleanup Redis
    await this.redis.del(`otlobegy:dispatch:${dispatchId}`);
    await this.redis.del(`otlobegy:order-dispatch-active:${orderId}`);
    await this.redis.del(rejectedKey);

    this.logger.log(
      `Driver ${driverId} accepted dispatch ${dispatchId} for order ${order.orderNumber}`,
    );

    const members = order.vendorId 
      ? await this.prisma.vendorMember.findMany({ where: { vendorId: order.vendorId }, select: { userId: true } })
      : [];
    const vendorUserIds = members.map(m => m.userId);
    

    this.eventEmitter.emit(
      EVENTS.ORDER_STATUS_CHANGED,
      new OrderStatusChangedEvent(
        order.id,
        order.orderNumber,
        OrderStatus.LOOKING_FOR_DRIVER,
        nextStatus,
        order.customerId,
        order.customer?.userId || order.customerId, // Using customer.userId if loaded
        order.vendorId,
        vendorUserIds,
        driverId,
        candidate.userId,
        candidate.userId,
        requiresCustomerApproval 
          ? 'Driver found. Please approve final fee.' 
          : 'Driver found and auto-assigned.',
      ),
    );

    if (requiresCustomerApproval) {
      const timeoutMins = (settings as any).customerApprovalTimeoutMins ?? 5;
      await this.ordersQueue.add(
        ORDER_JOBS.CUSTOMER_APPROVAL_TIMEOUT,
        { orderId: order.id, orderNumber: order.orderNumber, driverId },
        { delay: timeoutMins * 60 * 1000, jobId: `customer-approval-timeout-${order.id}` }
      );
    }
  }

  // ─── Handle rejection ─────────────────────────────────────────────────────

  async handleRejection(dispatchId: string, driverId: string): Promise<void> {
    const raw = await this.redis.get(`otlobegy:dispatch:${dispatchId}`);
    if (!raw) return;

    const dispatchData = JSON.parse(raw);

    // Strict timestamp validation since Redis TTL outlives the dispatch window
    if (Date.now() > new Date(dispatchData.expiresAt).getTime()) {
      this.logger.warn(
        `Driver ${driverId} attempted to reject dispatch ${dispatchId} but it is past expiresAt timestamp`,
      );
      return;
    }

    const orderId = dispatchData.orderId;
    const candidate = (dispatchData.candidates || []).find(
      (c: any) => c.driverId === driverId,
    );

    if (!candidate) return;

    // Atomic addition to a Redis Set
    const rejectedKey = `otlobegy:dispatch:${dispatchId}:rejected`;
    const added = await this.redis.sadd(rejectedKey, driverId);
    if (added === 0) return; // Already rejected
    
    // Set TTL for the rejected set to automatically cleanup
    const ttl = Math.max(1, Math.floor((new Date(dispatchData.expiresAt).getTime() - Date.now()) / 1000) + 60);
    await this.redis.expire(rejectedKey, ttl);

    // Persist terminal state to Postgres for this specific rejection
    await this.prisma.orderDispatch.create({
      data: {
        id: uuidv4(),
        orderId,
        driverId,
        driverShiftId: candidate.driverShiftId,
        type: dispatchData.type,
        distanceKm: candidate.distanceKm,
        estimatedEarnings: candidate.estimatedEarnings,
        status: 'REJECTED',
        expiresAt: new Date(dispatchData.expiresAt),
      },
    });

    if (candidate.driverShiftId) {
      await this.prisma.driverShift.update({
        where: { id: candidate.driverShiftId },
        data: { rejectedDispatches: { increment: 1 } },
      });
    }

    this.logger.log(
      `Driver ${driverId} rejected dispatch ${dispatchId} for order ${orderId}`,
    );

    const totalRejected = await this.redis.scard(rejectedKey);

    // If all candidates rejected it, expire early and retry
    if (totalRejected >= dispatchData.candidates.length) {
      await this.redis.del(`otlobegy:dispatch:${dispatchId}`);
      await this.redis.del(`otlobegy:order-dispatch-active:${orderId}`);
      await this.redis.del(rejectedKey);

      const expiryJob = await this.dispatchQueue.getJob(
        `dispatch-expire-${dispatchId}`,
      );
      
      const rejectedList = await this.redis.smembers(rejectedKey);

      if (expiryJob) {
        // We delete the pending expiry job because we are handling it immediately
        await expiryJob.remove();

        await this.dispatchQueue.add(ORDER_JOBS.DISPATCH, {
          orderId,
          orderNumber: expiryJob.data.orderNumber,
          attempt: expiryJob.data.attempt + 1,
          excludeDriverIds: expiryJob.data.excludeDriverIds,
        });
      } else {
        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
        });
        if (order) {
          await this.dispatchQueue.add(ORDER_JOBS.DISPATCH, {
            orderId,
            orderNumber: order.orderNumber,
            attempt: 1,
            excludeDriverIds: rejectedList,
          });
        }
      }
    }
  }

  // ─── Verify pending dispatch (for API endpoints) ──────────────────────────

  async verifyPendingDispatch(
    dispatchId: string,
    driverId: string,
  ): Promise<string | null> {
    const raw = await this.redis.get(`otlobegy:dispatch:${dispatchId}`);
    if (!raw) return null;

    const dispatchData = JSON.parse(raw);

    if (Date.now() > new Date(dispatchData.expiresAt).getTime()) {
      return null;
    }

    const candidate = dispatchData.candidates.find(
      (c: any) => c.driverId === driverId,
    );

    if (!candidate) return null;
    const isRejected = (await this.redis.smembers(`otlobegy:dispatch:${dispatchId}:rejected`)).includes(driverId);
    if (isRejected) return null;

    return dispatchData.orderId;
  }

  // ─── Get pending dispatches for driver ────────────────────────────────────

  async getPendingForDriver(driverUserId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId: driverUserId },
      select: { id: true },
    });
    if (!driver) return [];

    const activeDispatches = await this.prisma.orderDispatch.findMany({
      where: {
        driverId: driver.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: {
        order: true,
      },
    });

    return activeDispatches;
  }

  // ─── Cancel active dispatch (e.g. order cancelled) ────────────────────────

  async cancelActiveDispatch(orderId: string): Promise<void> {
    const dispatchId = await this.redis.get(
      `otlobegy:order-dispatch-active:${orderId}`,
    );
    if (!dispatchId) return;

    const raw = await this.redis.get(`otlobegy:dispatch:${dispatchId}`);
    if (!raw) return;

    const dispatchData = JSON.parse(raw);

    // Cleanup Redis
    await this.redis.del(`otlobegy:dispatch:${dispatchId}`);
    await this.redis.del(`otlobegy:order-dispatch-active:${orderId}`);
    const rejectedKey = `otlobegy:dispatch:${dispatchId}:rejected`;
    const rejectedBy: string[] = await this.redis.smembers(rejectedKey);
    await this.redis.del(rejectedKey);

    // Persist terminal state to Postgres
    const candidates = dispatchData.candidates || [];

    const unresponded = candidates.filter(
      (c: any) => !rejectedBy.includes(c.driverId),
    );

    if (unresponded.length > 0) {
      await this.prisma.orderDispatch.createMany({
        data: unresponded.map((candidate: any) => ({
          id: uuidv4(),
          orderId,
          driverId: candidate.driverId,
          driverShiftId: candidate.driverShiftId,
          type: dispatchData.type,
          distanceKm: candidate.distanceKm,
          estimatedEarnings: candidate.estimatedEarnings,
          status: 'CANCELLED',
          expiresAt: new Date(dispatchData.expiresAt),
        })),
      });

      for (const candidate of unresponded) {
        this.eventEmitter.emit(
          EVENTS.ORDER_DISPATCH_CANCELLED,
          new OrderDispatchCancelledEvent(
            dispatchId,
            orderId,
            candidate.userId,
          ),
        );
      }
    }

    this.logger.log(
      `Active dispatch ${dispatchId} cancelled for order ${orderId}`,
    );
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async calculateEstimatedEarnings(
    distanceKm: number,
    perKmOverride?: number | null,
    prefetchedSettings?: any,
  ): Promise<number> {
    const deliveryFee = await this.platformSettings.calculateDeliveryFee(
      distanceKm,
      null,
      perKmOverride,
      true,
      prefetchedSettings,
    );
    const settings = prefetchedSettings ?? (await this.platformSettings.getSettings());
    const driverCommissionRate = settings.deliveryCommissionRate ?? 20;
    const driverShare = 1 - (driverCommissionRate / 100);

    return Math.round(deliveryFee * driverShare);
  }
}
