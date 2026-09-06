import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrdersRepository, CreateOrderData, OrderItemData } from './orders.repository';
import { CartService } from '../cart/cart.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import {
  PlaceOrderDto,
  UpdateOrderStatusDto,
  QueryOrdersDto,
  RespondToDispatchDto,
  AdminAssignDriverDto,
  PlaceCustomOrderDto,
  EditOrderItemsDto,
  PlaceDirectOrderDto,
} from './dto/order.dto';
import {
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  OrderCancelledEvent,
  OrderDispatchRespondedEvent,
  OrderPaymentStatusChangedEvent,
} from '../../common/events';
import { EVENTS } from '../../common/events/event-names';
import { JwtAccessPayload } from '../../common/interfaces/jwt-payload.interface';
import {
  Prisma,
  OrderStatus,
  Role,
  PaymentMethod,
  DispatchStatus,
  Permission,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  CartErrors,
  ProductErrors,
  OrderErrors,
  CustomerErrors,
  DriverErrors,
} from '../../common/constants/response.constants';


const VENDOR_ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.ACCEPTED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP],
  [OrderStatus.LOOKING_FOR_DRIVER]: [
    OrderStatus.PREPARING,
    OrderStatus.READY_FOR_PICKUP,
  ],
  [OrderStatus.DRIVER_ASSIGNED]: [
    OrderStatus.PREPARING,
    OrderStatus.READY_FOR_PICKUP,
  ],
  [OrderStatus.PENDING_PAYMENT]: [
    OrderStatus.PREPARING,
    OrderStatus.READY_FOR_PICKUP,
  ],
  [OrderStatus.PREPARING]: [OrderStatus.READY_FOR_PICKUP],
  [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.PICKED_UP],
  [OrderStatus.PENDING_CUSTOMER_APPROVAL]: [OrderStatus.PREPARING],
  [OrderStatus.PICKED_UP]: [],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.CHANGES_REQUESTED]: [],
};

const DRIVER_ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.DRIVER_ASSIGNED]: [
    OrderStatus.PENDING_PAYMENT,
    OrderStatus.READY_FOR_PICKUP,
    OrderStatus.PICKED_UP,
  ],
  [OrderStatus.PENDING_PAYMENT]: [
    OrderStatus.READY_FOR_PICKUP,
    OrderStatus.PICKED_UP,
  ],
  [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.PICKED_UP],
  [OrderStatus.PICKED_UP]: [OrderStatus.DELIVERED, OrderStatus.PENDING_PAYMENT],
  [OrderStatus.PENDING]: [],
  [OrderStatus.PENDING_CUSTOMER_APPROVAL]: [],
  [OrderStatus.CHANGES_REQUESTED]: [],
  [OrderStatus.ACCEPTED]: [],
  [OrderStatus.PREPARING]: [],
  [OrderStatus.LOOKING_FOR_DRIVER]: [],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

const NON_CANCELLABLE: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
  OrderStatus.PICKED_UP,
];
import { forwardRef, Inject } from '@nestjs/common';

@Injectable()
export class OrdersStateService {
  private readonly logger = new Logger(OrdersStateService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    @Inject(forwardRef(() => DispatchService)) private readonly dispatchService: DispatchService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

async vendorUpdateStatus(
    actor: JwtAccessPayload,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const order = await this.ordersRepository.findById(orderId);

    const [isMember, canManage] = await Promise.all([
      order.vendorId
        ? this.prisma.vendorMember.findUnique({
            where: {
              vendorId_userId: { vendorId: order.vendorId, userId: actor.sub },
            },
            select: { id: true, branchId: true },
          })
        : Promise.resolve(null),
      this.canManageOrders(actor.sub, actor.role),
    ]);

    if (!isMember && !canManage) {
      throw new ForbiddenException(OrderErrors.NOT_MEMBER_OF_VENDOR);
    }

    if (
      isMember &&
      isMember.branchId &&
      isMember.branchId !== (order as any).vendorBranchId
    ) {
      throw new ForbiddenException(OrderErrors.NOT_ASSIGNED_TO_BRANCH);
    }

    if (dto.status === OrderStatus.CANCELLED) {
      return this.cancelOrder(
        actor,
        orderId,
        dto.note ?? 'Cancelled by vendor',
      );
    }

    const allowed = VENDOR_ALLOWED_TRANSITIONS[order.status];
    if (!allowed || !allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid transition: ${order.status} → ${dto.status}`,
      );
    }

    return this.applyStatusTransition(actor, order, dto);
  }

async driverUpdateStatus(
    actor: JwtAccessPayload,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const order = await this.ordersRepository.findById(orderId);

    const driver = await this.prisma.driver.findUnique({
      where: { userId: actor.sub },
      select: { id: true },
    });
    if (!driver || order.driverId !== driver.id) {
      throw new ForbiddenException(OrderErrors.NOT_ASSIGNED_TO_ORDER);
    }

    // Restriction removed: allow drivers to mark the order as PICKED_UP 
    // even if the store is contracted, to prevent drivers from getting stuck 
    // if the vendor employee forgets to update the status on their tablet.
    const expected = DRIVER_ALLOWED_TRANSITIONS[order.status];
    if (!expected || !expected.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid transition: ${order.status} → ${dto.status}`,
      );
    }

    return this.applyStatusTransition(actor, order, dto);
  }

async respondToDispatch(
    actor: JwtAccessPayload,
    dispatchId: string,
    dto: RespondToDispatchDto,
  ) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId: actor.sub },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException(DriverErrors.PROFILE_NOT_FOUND);

    const orderId = await this.dispatchService.verifyPendingDispatch(
      dispatchId,
      driver.id,
    );
    if (!orderId) {
      throw new BadRequestException(OrderErrors.DISPATCH_NOT_FOUND);
    }

    if (dto.response === 'ACCEPTED') {
      try {
        await this.dispatchService.handleAcceptance(dispatchId, driver.id);
        
        // Emit purely for analytical tracking after successful assignment
        this.eventEmitter.emit(
          EVENTS.ORDER_DISPATCH_RESPONDED,
          new OrderDispatchRespondedEvent(
            dispatchId,
            orderId,
            driver.id,
            DispatchStatus.ACCEPTED,
          ),
        );
      } catch (error) {
        if ((error as Error).message === OrderErrors.ALREADY_ASSIGNED_OR_CANCELLED) {
          throw new BadRequestException(OrderErrors.ALREADY_ASSIGNED_OR_CANCELLED);
        }
        throw error;
      }
    } else {
      this.eventEmitter.emit(
        EVENTS.ORDER_DISPATCH_RESPONDED,
        new OrderDispatchRespondedEvent(
          dispatchId,
          orderId,
          driver.id,
          DispatchStatus.REJECTED,
        ),
      );
    }

    return { response: dto.response };
  }

async adminForceAssignDriver(
    actor: JwtAccessPayload,
    orderId: string,
    dto: AdminAssignDriverDto,
  ) {
    const order = await this.ordersRepository.findById(orderId);

    const assignableStatuses: OrderStatus[] = [
      OrderStatus.ACCEPTED,
      OrderStatus.PREPARING,
      OrderStatus.READY_FOR_PICKUP,
      OrderStatus.LOOKING_FOR_DRIVER,
    ];
    if (!assignableStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Cannot force-assign driver to order in status: ${order.status}`,
      );
    }

    const driver = await this.prisma.driver.findUnique({
      where: { id: dto.driverId },
      select: { id: true, status: true, userId: true },
    });
    if (!driver) throw new NotFoundException(DriverErrors.PROFILE_NOT_FOUND);

    if (driver.status === 'SUSPENDED') {
      throw new BadRequestException(OrderErrors.CANNOT_ASSIGN_SUSPENDED_DRIVER);
    }

    // Get active shift if any
    const activeShift = await this.prisma.driverShift.findFirst({
      where: { driverId: driver.id, status: 'ACTIVE' },
      select: { id: true },
    });

    // If the order already had a driver, free them first
    if (order.driverId && order.driverId !== driver.id) {
      await this.ordersRepository.freeDriver(order.driverId);
    }

    const nextStatus =
      order.paymentMethod === 'MOBILE_WALLET'
        ? OrderStatus.PENDING_PAYMENT
        : OrderStatus.DRIVER_ASSIGNED;

    const updated = await this.ordersRepository.assignDriver(
      orderId,
      driver.id,
      activeShift?.id ?? null,
      actor.sub,
      nextStatus,
    );

    // The dispatch listener will catch ORDER_STATUS_CHANGED to DRIVER_ASSIGNED
    // and cancel any automated dispatch ping that might be running automatically.

    const vendorUserIds = await this.ordersRepository.getVendorUserIds(
      order.vendorId,
    );
    const customerUser = (order as { customer?: { user?: { id: string } } })
      .customer?.user;

    this.eventEmitter.emit(
      EVENTS.ORDER_STATUS_CHANGED,
      new OrderStatusChangedEvent(
        orderId,
        order.orderNumber,
        order.status,
        nextStatus,
        order.customerId,
        customerUser?.id ?? '',
        order.vendorId,
        vendorUserIds,
        driver.id,
        driver.userId,
        actor.sub,
        `Driver manually assigned by admin. ${nextStatus === OrderStatus.PENDING_PAYMENT ? 'Awaiting mobile wallet payment.' : ''}`,
      ),
    );

    this.logger.log(
      `Admin ${actor.sub} force-assigned driver ${driver.id} to order ${order.orderNumber}`,
    );
    return updated;
  }

async cancelOrder(
    actor: JwtAccessPayload | null,
    orderId: string,
    reason: string,
  ) {
    const order = await this.ordersRepository.findById(orderId);

    if (NON_CANCELLABLE.includes(order.status)) {
      throw new BadRequestException(
        `Cannot cancel order in status: ${order.status}`,
      );
    }

    const vendorUserIds = await this.ordersRepository.getVendorUserIds(order.vendorId);

    await this.ordersRepository.updateStatus(
      orderId,
      OrderStatus.CANCELLED,
      actor?.sub ?? 'system',
      reason,
      undefined,
      order.status
    );

    if (order.coinsUsed > 0) {
      await this.prisma.$transaction(async (tx) => {
        const customer = await tx.customer.update({
          where: { id: order.customerId },
          data: { coinBalance: { increment: order.coinsUsed } },
          select: { coinBalance: true },
        });
        await tx.customerCoinTransaction.create({
          data: {
            customerId: order.customerId,
            orderId: order.id,
            type: 'REFUNDED',
            amount: order.coinsUsed,
            balanceAfter: customer.coinBalance,
            description: `Refund for cancelled order ${order.orderNumber}`,
          },
        });
      });
    }

    if (order.driverId) {
      await this.ordersRepository.freeDriver(order.driverId);
    }

    // Always abort any active dispatch attempts
    await this.ordersRepository.cancelPendingDispatches(orderId);

    const orderWithRelations = order as {
      driver: { userId: string } | null;
      customer: { user: { id: string } };
    };

    const driverUserId = orderWithRelations.driver?.userId ?? null;

    this.eventEmitter.emit(
      EVENTS.ORDER_CANCELLED,
      new OrderCancelledEvent(
        orderId,
        order.orderNumber,
        order.customerId,
        orderWithRelations.customer.user.id,
        order.vendorId,
        vendorUserIds,
        order.driverId,
        driverUserId,
        reason,
        actor?.sub ?? null,
      ),
    );

    this.logger.log(`Order ${order.orderNumber} cancelled: ${reason}`);
    return this.ordersRepository.findById(orderId);
  }

private async applyStatusTransition(
    actor: JwtAccessPayload,
    order: {
      id: string;
      status: string;
      orderNumber: string;
      customerId: string;
      vendorId: string | null;
      driverId: string | null;
      customer: { user: { id: string } };
      driver: { userId: string } | null;
    },
    dto: UpdateOrderStatusDto,
  ) {
    const oldStatus = order.status as OrderStatus;
    const newStatus = dto.status;

    const extraData: Prisma.OrderUpdateInput = {};
    if (newStatus === OrderStatus.ACCEPTED) {
      extraData.acceptedAt = new Date();
      if (dto.estimatedPrepTime)
        extraData.estimatedPrepTime = dto.estimatedPrepTime;
    }
    if (newStatus === OrderStatus.READY_FOR_PICKUP)
      extraData.preparedAt = new Date();
    if (newStatus === OrderStatus.PICKED_UP) extraData.pickedUpAt = new Date();
    if (newStatus === OrderStatus.DELIVERED)
      extraData.actualDeliveryTime = new Date();

    const updated = await this.ordersRepository.updateStatus(
      order.id,
      newStatus,
      actor.sub,
      dto.note,
      extraData,
      oldStatus,
    );

    if (order.driverId && newStatus === OrderStatus.DELIVERED) {
      await this.ordersRepository.freeDriver(order.driverId);
    }

    const vendorUserIds = await this.ordersRepository.getVendorUserIds(
      order.vendorId,
    );
    const driverUserId = order.driver?.userId ?? null;

    this.eventEmitter.emit(
      EVENTS.ORDER_STATUS_CHANGED,
      new OrderStatusChangedEvent(
        order.id,
        order.orderNumber,
        oldStatus,
        newStatus,
        order.customerId,
        order.customer.user.id,
        order.vendorId,
        vendorUserIds,
        order.driverId,
        driverUserId,
        actor.sub,
        dto.note ?? null,
      ),
    );

    this.logger.log(`Order ${order.orderNumber}: ${oldStatus} → ${newStatus}`);
    return updated;
  }

private async canManageOrders(userId: string, role: Role): Promise<boolean> {
    if (role === Role.SUPER_ADMIN) return true;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { permissions: true },
    });
    return !!user?.permissions.includes(Permission.MANAGE_ORDERS);
  }

}
