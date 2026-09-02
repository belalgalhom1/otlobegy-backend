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

@Injectable()
export class OrdersPaymentService {
  private readonly logger = new Logger(OrdersPaymentService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

async approveOrderFee(actor: JwtAccessPayload, orderId: string) {
    const order = await this.ordersRepository.findById(orderId);
    if (!order) throw new NotFoundException(OrderErrors.NOT_FOUND);

    if (order.customer.userId !== actor.sub) {
      throw new ForbiddenException();
    }

    if (order.status !== OrderStatus.PENDING_CUSTOMER_APPROVAL) {
      throw new BadRequestException(OrderErrors.NOT_PENDING_APPROVAL);
    }

    const nextStatus =
      order.paymentMethod === 'MOBILE_WALLET'
        ? OrderStatus.PENDING_PAYMENT
        : OrderStatus.DRIVER_ASSIGNED;

    const vendorUserIds = await this.ordersRepository.getVendorUserIds(order.vendorId);

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: { id: orderId, status: OrderStatus.PENDING_CUSTOMER_APPROVAL },
        data: { status: nextStatus },
      });

      if (updated.count === 0) {
        throw new BadRequestException(OrderErrors.CONCURRENT_STATE_CHANGE);
      }

      await tx.orderStatusEvent.create({
        data: {
          orderId,
          status: nextStatus,
          note: 'Customer approved final delivery fee.',
          createdBy: actor.sub,
        },
      });

      if (order.driverId) {
        await tx.driver.update({
          where: { id: order.driverId },
          data: { status: 'ON_DELIVERY' },
        });
      }
    });

    this.eventEmitter.emit(
      EVENTS.ORDER_STATUS_CHANGED,
      new OrderStatusChangedEvent(
        order.id,
        order.orderNumber,
        order.status,
        nextStatus,
        order.customerId,
        order.customer.user.id,
        order.vendorId,
        vendorUserIds,
        order.driverId,
        order.driver?.userId ?? null,
        actor.sub,
        'Customer approved final delivery fee.',
      ),
    );

    return { message: 'Order fee approved successfully.' };
  }

async customerMarkPaid(actor: JwtAccessPayload, orderId: string) {
    const order = await this.ordersRepository.findById(orderId);

    if (order.customer.user.id !== actor.sub) {
      throw new ForbiddenException(OrderErrors.NOT_AUTHORIZED_VIEW);
    }
    if (order.paymentMethod !== 'MOBILE_WALLET') {
      throw new BadRequestException(OrderErrors.NOT_MOBILE_WALLET);
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(OrderErrors.NOT_AWAITING_PAYMENT);
    }

    // Customer clicks "I paid". We don't change the main OrderStatus (it remains PENDING_PAYMENT)
    // but we can update paymentStatus to indicate they claim it's paid.
    const updated = await this.prisma.order.updateMany({
      where: { id: orderId, status: OrderStatus.PENDING_PAYMENT },
      data: { paymentStatus: 'PAID' },
    });
    
    if (updated.count === 0) {
      throw new BadRequestException(OrderErrors.CONCURRENT_MODIFICATION);
    }

    this.logger.log(
      `Customer marked mobile wallet payment as PAID for order ${order.orderNumber}`,
    );

    const vendorUserIds = await this.ordersRepository.getVendorUserIds(
      order.vendorId,
    );
    this.eventEmitter.emit(
      EVENTS.ORDER_PAYMENT_STATUS_CHANGED,
      new OrderPaymentStatusChangedEvent(
        order.id,
        order.orderNumber,
        'PAID',
        order.customer.user.id,
        order.driver?.userId ?? null,
        vendorUserIds,
        'Customer marked order as paid.',
      ),
    );

    return {
      success: true,
      message: 'Payment marked as paid. Waiting for driver confirmation.',
    };
  }

async driverConfirmPayment(
    actor: JwtAccessPayload,
    orderId: string,
    received: boolean,
  ) {
    const order = await this.ordersRepository.findById(orderId);

    const driver = await this.prisma.driver.findUnique({
      where: { userId: actor.sub },
      select: { id: true, userId: true },
    });
    if (!driver || order.driverId !== driver.id) {
      throw new ForbiddenException(OrderErrors.NOT_ASSIGNED_TO_ORDER);
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(OrderErrors.NOT_AWAITING_PAYMENT);
    }

    if (received) {
      // Driver confirms they received the money. Transition order to DRIVER_ASSIGNED
      // and finalize paymentStatus to COMPLETED.
      const updatedOrder = await this.ordersRepository.updateStatus(
        orderId,
        OrderStatus.DRIVER_ASSIGNED,
        actor.sub,
        'Driver confirmed payment received.',
        { paymentStatus: 'COMPLETED' },
        OrderStatus.PENDING_PAYMENT
      );

      this.logger.log(
        `Driver confirmed payment for order ${order.orderNumber}. Order is now DRIVER_ASSIGNED.`,
      );

      const vendorUserIds = await this.ordersRepository.getVendorUserIds(
        order.vendorId,
      );
      this.eventEmitter.emit(
        EVENTS.ORDER_PAYMENT_STATUS_CHANGED,
        new OrderPaymentStatusChangedEvent(
          order.id,
          order.orderNumber,
          'COMPLETED',
          order.customer.user.id,
          driver.userId,
          vendorUserIds,
          'Driver confirmed payment received.',
        ),
      );

      this.eventEmitter.emit(
        EVENTS.ORDER_STATUS_CHANGED,
        new OrderStatusChangedEvent(
          order.id,
          order.orderNumber,
          OrderStatus.PENDING_PAYMENT,
          OrderStatus.DRIVER_ASSIGNED,
          order.customerId,
          order.customer.user.id,
          order.vendorId,
          vendorUserIds,
          order.driverId,
          driver.userId,
          actor.sub,
          'Driver confirmed payment received.',
        ),
      );

      return { success: true, status: OrderStatus.DRIVER_ASSIGNED };
    } else {
      // Driver says they did NOT receive the money. Revert payment status so customer can try again,
      // or we could cancel the order. For now, just revert payment status.
      const updated = await this.prisma.order.updateMany({
        where: { id: orderId, status: OrderStatus.PENDING_PAYMENT },
        data: { paymentStatus: 'PENDING' },
      });
      if (updated.count === 0) {
        throw new BadRequestException(OrderErrors.CONCURRENT_MODIFICATION);
      }
      this.logger.log(`Driver denied payment for order ${order.orderNumber}.`);

      const vendorUserIds = await this.ordersRepository.getVendorUserIds(
        order.vendorId,
      );
      this.eventEmitter.emit(
        EVENTS.ORDER_PAYMENT_STATUS_CHANGED,
        new OrderPaymentStatusChangedEvent(
          order.id,
          order.orderNumber,
          'PENDING',
          order.customer.user.id,
          driver.userId,
          vendorUserIds,
          'Driver denied payment. Please send again.',
        ),
      );

      return {
        success: true,
        message: 'Payment denied. Customer must send again.',
      };
    }
  }

}
