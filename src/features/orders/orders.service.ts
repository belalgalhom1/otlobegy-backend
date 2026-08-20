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
} from 'src/common/events';
import { EVENTS } from 'src/common/events/event-names';
import { JwtAccessPayload } from 'src/common/interfaces/jwt-payload.interface';
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
} from 'src/common/constants/response.constants';

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
  [OrderStatus.PICKED_UP]: [OrderStatus.DELIVERED],
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

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly cartService: CartService,
    private readonly dispatchService: DispatchService,
    private readonly platformSettings: PlatformSettingsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Place order ──────────────────────────────────────────────────────────

  async placeOrder(actor: JwtAccessPayload, dto: PlaceOrderDto) {
    const { customerId, coinBalance, cart } =
      await this.cartService.validateForCheckout(actor.sub, dto.vendorId);

    await this.validateActiveOrderLimit(customerId);

    const vendor = await this.prisma.vendor.findUnique({
      where: { id: dto.vendorId },
      select: {
        id: true,
        status: true,
        commissionRate: true,
        isContracted: true,
      },
    });
    if (!vendor || vendor.status !== 'OPEN') {
      throw new BadRequestException(OrderErrors.VENDOR_NOT_ACCEPTING);
    }

    const settings = await this.platformSettings.getSettings();
    const minOrder = Number(settings.minOrderAmount);
    if (minOrder > 0 && cart.subtotal < minOrder) {
      throw new BadRequestException(
        `Minimum order amount is ${minOrder} ${settings.currency}`,
      );
    }

    const [lng, lat] = dto.deliveryLocation;
    const zone = await this.ordersRepository.getZoneAtLocation(lng, lat);
    if (!zone) {
      throw new BadRequestException(CustomerErrors.OUT_OF_DELIVERY_ZONES);
    }

    const branch = await this.ordersRepository.getNearestOpenBranchLocation(
      dto.vendorId,
      lng,
      lat,
    );
    const distanceKm = branch
      ? await this.ordersRepository.getDistanceKm(
          branch.lng,
          branch.lat,
          lng,
          lat,
        )
      : (Number(settings.fallbackOrderDistanceKm) ?? 3);

    const deliveryFee = await this.platformSettings.calculateDeliveryFee(
      distanceKm,
      zone?.baseDeliveryFeeOverride ?? null,
    );

    // Calculate commission/service rate based on manually configured percentage
    const commissionRate = Number(vendor.commissionRate) / 100;

    // If vendor is NOT contracted with us, add their percentage as a service fee to the customer invoice
    const serviceFee = !vendor.isContracted
      ? Math.round(cart.subtotal * commissionRate)
      : 0;

    const taxRate = Number(settings.defaultTaxRate) / 100;
    const tax = Math.round((cart.subtotal + serviceFee) * taxRate);

    let driverBonusFee = 0;
    const now = new Date();
    if (
      settings.driverBonusActive &&
      settings.driverBonusAmount &&
      settings.driverBonusAmount > 0 &&
      settings.driverBonusStartDate &&
      settings.driverBonusEndDate &&
      now >= settings.driverBonusStartDate &&
      now <= settings.driverBonusEndDate
    ) {
      driverBonusFee = Number(settings.driverBonusAmount);
    }

    let preDiscountTotal = cart.subtotal + deliveryFee + serviceFee + tax;
    if (settings.driverBonusPaidByCustomer && driverBonusFee > 0) {
      preDiscountTotal += driverBonusFee;
    }

    let coinsUsed = 0;
    let discount = 0;
    if (dto.coinsToUse && dto.coinsToUse > 0) {
      if (!coinBalance || coinBalance < Number(settings.minCoinsToUse)) {
        throw new BadRequestException(CustomerErrors.MINIMUM_COINS_REQUIRED);
      }
      if (coinBalance < dto.coinsToUse) {
        throw new BadRequestException(CustomerErrors.INSUFFICIENT_COIN_BALANCE);
      }
      coinsUsed = dto.coinsToUse;
      discount = coinsUsed * Number(settings.coinValue);
      if (discount > preDiscountTotal) {
        discount = preDiscountTotal;
        coinsUsed = Math.ceil(discount / Number(settings.coinValue));
      }
    }

    const grandTotal = preDiscountTotal - discount;
    const coinsEarned = Math.floor(
      preDiscountTotal / Number(settings.amountSpentPerCoin),
    );

    let upfrontAmount = 0;
    if (
      dto.paymentMethod === 'CASH_ON_DELIVERY' &&
      settings.highValueOrderThreshold &&
      settings.highValueOrderThreshold > 0 &&
      grandTotal >= settings.highValueOrderThreshold
    ) {
      upfrontAmount = Math.ceil(
        grandTotal * (Number(settings.highValueUpfrontRate) / 100),
      );
    }

    type CartItemPayload = {
      productId: string;
      variantId?: string | null;
      unitPrice: number;
      quantity: number;
      totalPrice: number;
      specialRequest?: string | null;
      product: { name: string };
      variant?: { name: string } | null;
      options: { id: string; name: string; priceAdded: number | string }[];
    };

    const items: OrderItemData[] = cart.items.map((item: any) => ({
      productId: item.productId,
      variantId: item.variantId ?? null,
      productName: item.product.name ?? 'Unknown Product',
      variantName: item.variant?.name ?? null,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      totalPrice: item.totalPrice,
      specialRequest: item.specialRequest ?? null,
      options: item.options.map((opt) => ({
        optionId: opt.id,
        optionName: opt.name,
        priceAdded: Number(opt.priceAdded),
      })),
    }));

    const orderNumber = await this.ordersRepository.generateOrderNumber();
    const created = await this.ordersRepository.createOrder(
      {
        orderNumber,
        customerId,
        vendorId: dto.vendorId ?? null,
        vendorBranchId: branch?.id ?? null,
        zoneId: zone?.id ?? null,
        paymentMethod: dto.paymentMethod,
        deliveryAddress: dto.deliveryAddress,
        deliveryLng: lng,
        deliveryLat: lat,
        subtotal: cart.subtotal,
        deliveryFee,
        driverBonusFee,
        serviceFee,
        tax,
        discount,
        coinsUsed,
        coinsEarned,
        grandTotal,
        upfrontAmount,
        distanceKm,
        specialRequest: dto.specialRequest ?? null,
        type: 'STANDARD',
        pickupAddress: null,
        pickupLng: branch?.lng ?? null,
        pickupLat: branch?.lat ?? null,
        itemDetails: null,
        requestedVehicleType: null,
      },
      items,
      actor.sub,
    );

    // The cart listener will catch ORDER_CREATED and clear the cart automatically.

    const vendorUserIds = await this.ordersRepository.getVendorUserIds(
      dto.vendorId,
    );

    this.eventEmitter.emit(
      EVENTS.ORDER_CREATED,
      new OrderCreatedEvent(
        created.id,
        created.orderNumber,
        customerId,
        actor.sub,
        dto.vendorId,
        vendorUserIds,
        grandTotal,
        dto.paymentMethod,
        'STANDARD',
      ),
    );

    this.logger.log(
      `Order placed: ${created.orderNumber} by user ${actor.sub}`,
    );
    return this.ordersRepository.findById(created.id);
  }

  // ─── Customer: custom delivery / ride ─────────────────────────────────────

  async placeCustomOrder(actor: JwtAccessPayload, dto: PlaceCustomOrderDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId: actor.sub },
      select: { id: true, coinBalance: true },
    });
    if (!customer)
      throw new NotFoundException(CustomerErrors.CUSTOMER_NOT_FOUND);
    const customerId = customer.id;

    await this.validateActiveOrderLimit(customerId);

    if (dto.type === 'RIDE' && dto.vehicleType !== 'CAR') {
      throw new BadRequestException(OrderErrors.RIDES_MUST_USE_CAR);
    }

    const [pickupLng, pickupLat] = dto.pickupLocation;
    const [deliveryLng, deliveryLat] = dto.deliveryLocation;

    const distanceKm = await this.ordersRepository.getDistanceKm(
      pickupLng,
      pickupLat,
      deliveryLng,
      deliveryLat,
    );

    const settings = await this.platformSettings.getSettings();
    let perKm = 0;
    switch (dto.vehicleType) {
      case 'BICYCLE':
        if (!settings.allowBicycle)
          throw new BadRequestException(OrderErrors.VEHICLE_TYPE_DISABLED);
        perKm = Number(settings.pricePerKmBicycle);
        break;
      case 'MOTORCYCLE':
        if (!settings.allowMotorcycle)
          throw new BadRequestException(OrderErrors.VEHICLE_TYPE_DISABLED);
        perKm = Number(settings.pricePerKmMotorcycle);
        break;
      case 'CAR':
        if (!settings.allowCar)
          throw new BadRequestException(OrderErrors.VEHICLE_TYPE_DISABLED);
        perKm = Number(settings.pricePerKmCar);
        break;
      case 'VAN':
        if (!settings.allowVan)
          throw new BadRequestException(OrderErrors.VEHICLE_TYPE_DISABLED);
        perKm = Number(settings.pricePerKmVan);
        break;
      case 'TRUCK':
        if (!settings.allowTruck)
          throw new BadRequestException(OrderErrors.VEHICLE_TYPE_DISABLED);
        perKm = Number(settings.pricePerKmTruck);
        break;
      case 'MOTOR_TRICYCLE':
        if (!settings.allowMotorTricycle)
          throw new BadRequestException(OrderErrors.VEHICLE_TYPE_DISABLED);
        perKm = Number(settings.pricePerKmMotorTricycle);
        break;
    }

    const deliveryFee = await this.platformSettings.calculateDeliveryFee(
      distanceKm,
      null, // no zone override
      perKm,
      false, // isStandardOrder
    );
    const serviceFee = Number(settings.customOrderPlatformFee) || 0;
    const taxRate = Number(settings.defaultTaxRate) / 100;
    const tax = Math.round(serviceFee * taxRate);

    let driverBonusFee = 0;
    const now = new Date();
    if (
      settings.driverBonusActive &&
      settings.driverBonusAmount &&
      settings.driverBonusAmount > 0 &&
      settings.driverBonusStartDate &&
      settings.driverBonusEndDate &&
      now >= settings.driverBonusStartDate &&
      now <= settings.driverBonusEndDate
    ) {
      driverBonusFee = Number(settings.driverBonusAmount);
    }

    let preDiscountTotal = deliveryFee + serviceFee + tax;
    if (settings.driverBonusPaidByCustomer && driverBonusFee > 0) {
      preDiscountTotal += driverBonusFee;
    }

    let coinsUsed = 0;
    let discount = 0;
    if (dto.coinsToUse && dto.coinsToUse > 0) {
      if (customer.coinBalance < Number(settings.minCoinsToUse)) {
        throw new BadRequestException(CustomerErrors.MINIMUM_COINS_REQUIRED);
      }
      if (customer.coinBalance < dto.coinsToUse) {
        throw new BadRequestException(CustomerErrors.INSUFFICIENT_COIN_BALANCE);
      }
      coinsUsed = dto.coinsToUse;
      discount = coinsUsed * Number(settings.coinValue);
      if (discount > preDiscountTotal) {
        discount = preDiscountTotal;
        coinsUsed = Math.ceil(discount / Number(settings.coinValue));
      }
    }

    const grandTotal = preDiscountTotal - discount;
    const coinsEarned = Math.floor(
      preDiscountTotal / Number(settings.amountSpentPerCoin),
    );

    const orderNumber = await this.ordersRepository.generateOrderNumber();
    const created = await this.ordersRepository.createOrder(
      {
        orderNumber,
        customerId,
        vendorId: null,
        vendorBranchId: null,
        zoneId: null, // Custom orders might not be restricted to zones
        paymentMethod: dto.paymentMethod,
        deliveryAddress: dto.deliveryAddress,
        deliveryLng,
        deliveryLat,
        subtotal: 0,
        deliveryFee,
        driverBonusFee,
        serviceFee,
        tax,
        discount,
        coinsUsed,
        coinsEarned,
        grandTotal,
        upfrontAmount: 0,
        distanceKm,
        specialRequest: dto.specialRequest ?? null,
        type: dto.type,
        pickupAddress: dto.pickupAddress,
        pickupLng,
        pickupLat,
        itemDetails: dto.itemDetails ?? null,
        requestedVehicleType: dto.vehicleType,
      },
      [], // No items
      actor.sub,
    );

    // Custom Orders have no vendor to accept them, so they must be dispatched immediately
    await this.ordersRepository.updateStatus(
      created.id,
      'LOOKING_FOR_DRIVER',
      'system',
      'Auto-dispatched custom order',
    );

    this.eventEmitter.emit(
      EVENTS.ORDER_STATUS_CHANGED,
      new OrderStatusChangedEvent(
        created.id,
        created.orderNumber,
        OrderStatus.PENDING,
        OrderStatus.LOOKING_FOR_DRIVER,
        customerId,
        actor.sub,
        null,
        [],
        null,
        null,
        'system',
        'Auto-dispatched custom order',
      ),
    );

    this.eventEmitter.emit(
      EVENTS.ORDER_CREATED,
      new OrderCreatedEvent(
        created.id,
        created.orderNumber,
        customerId,
        actor.sub,
        null, // No vendor
        [], // No vendor members
        grandTotal,
        dto.paymentMethod,
        dto.type,
      ),
    );

    this.logger.log(
      `${dto.type} order placed: ${created.orderNumber} by user ${actor.sub}`,
    );
    return this.ordersRepository.findById(created.id);
  }

  // ─── Customer: my orders ──────────────────────────────────────────────────

  async getMyOrdersAsCustomer(actor: JwtAccessPayload, dto: QueryOrdersDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId: actor.sub },
      select: { id: true },
    });
    if (!customer)
      return { orders: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    return this.ordersRepository.findMany({ ...dto, customerId: customer.id });
  }

  // ─── Vendor: get orders ───────────────────────────────────────────────────

  async getVendorOrders(
    actor: JwtAccessPayload,
    vendorId: string,
    dto: QueryOrdersDto,
  ) {
    const [isMember, canManage] = await Promise.all([
      this.prisma.vendorMember.findUnique({
        where: { vendorId_userId: { vendorId, userId: actor.sub } },
        select: { id: true },
      }),
      this.canManageOrders(actor.sub, actor.role),
    ]);

    if (!isMember && !canManage) {
      throw new ForbiddenException(OrderErrors.NOT_AUTHORIZED_VENDOR);
    }

    return this.ordersRepository.findMany({ ...dto, vendorId });
  }

  // ─── Driver: my orders ────────────────────────────────────────────────────

  async getMyOrdersAsDriver(actor: JwtAccessPayload, dto: QueryOrdersDto) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId: actor.sub },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException(DriverErrors.PROFILE_NOT_FOUND);
    return this.ordersRepository.findMany({ ...dto, driverId: driver.id });
  }

  // ─── Get single order ─────────────────────────────────────────────────────

  async getOne(actor: JwtAccessPayload, orderId: string) {
    const order = await this.ordersRepository.findById(orderId);

    if (await this.canManageOrders(actor.sub, actor.role)) return order;

    const [customer, driver, vendorMember] = await Promise.all([
      this.prisma.customer.findUnique({
        where: { userId: actor.sub },
        select: { id: true },
      }),
      this.prisma.driver.findUnique({
        where: { userId: actor.sub },
        select: { id: true },
      }),
      order.vendorId
        ? this.prisma.vendorMember.findUnique({
            where: {
              vendorId_userId: { vendorId: order.vendorId, userId: actor.sub },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    const isOwner =
      (customer && order.customerId === customer.id) ||
      (driver && order.driverId === driver.id) ||
      !!vendorMember;

    if (!isOwner) throw new ForbiddenException(OrderErrors.NOT_AUTHORIZED_VIEW);
    return order;
  }

  // ─── Vendor: update status ────────────────────────────────────────────────

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

  // ─── Driver: respond to dispatch ──────────────────────────────────────────

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

  // ─── Driver: update status ────────────────────────────────────────────────

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

    if (dto.status === OrderStatus.PICKED_UP) {
      if ((order.vendor as any)?.isContracted) {
        throw new ForbiddenException(
          'For contracted stores, the store employee must confirm they received the cash to mark the order as picked up.',
        );
      }
    }

    const expected = DRIVER_ALLOWED_TRANSITIONS[order.status];
    if (!expected || !expected.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid transition: ${order.status} → ${dto.status}`,
      );
    }

    return this.applyStatusTransition(actor, order, dto);
  }

  // ─── Customer Approval ──────────────────────────────────────────────────

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
        throw new BadRequestException('Order state changed concurrently. Please refresh.');
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

  // ─── Cancel ───────────────────────────────────────────────────────────────

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

  // ─── Mobile Wallet Payment Flow ───────────────────────────────────────────

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

  // ─── Admin: list all ──────────────────────────────────────────────────────

  async adminFindAll(dto: QueryOrdersDto) {
    return this.ordersRepository.findMany(dto);
  }

  // ─── Admin: force assign driver ───────────────────────────────────────────

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

  // ─── Private helpers ──────────────────────────────────────────────────────

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

  // ─── Order Item Modifications ───────────────────────────────────────────────

  async editOrderItems(
    actor: JwtAccessPayload,
    orderId: string,
    dto: EditOrderItemsDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { vendor: true, items: { include: { selectedOptions: true } } },
    });
    if (!order) throw new NotFoundException(OrderErrors.NOT_FOUND);

    if (actor.role === 'VENDOR_MEMBER') {
      const member = await this.prisma.vendorMember.findFirst({
        where: { userId: actor.sub, vendorId: order.vendorId ?? '' },
      });
      if (!member) {
        throw new ForbiddenException(OrderErrors.NOT_AUTHORIZED_VENDOR);
      }
    } else if (actor.role === 'ADMIN') {
      const canManage = await this.canManageOrders(actor.sub, actor.role);
      if (!canManage)
        throw new ForbiddenException(OrderErrors.NOT_AUTHORIZED_VIEW);
    }

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.ACCEPTED
    ) {
      throw new BadRequestException(OrderErrors.CANNOT_EDIT_ITEMS);
    }

    let newSubtotal = 0;
    const newItems: any[] = [];

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        variants: {
          include: {
            optionGroups: { include: { options: true } },
          },
        },
        optionGroups: { include: { options: true } },
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const itemDto of dto.items) {
      const product = productMap.get(itemDto.productId);
      if (!product) throw new BadRequestException(ProductErrors.NOT_FOUND);

      let basePrice = Number(product.basePrice ?? 0);
      let variantName: string | null = null;

      if (itemDto.variantId) {
        const variant = product.variants.find(
          (v) => v.id === itemDto.variantId,
        );
        if (!variant)
          throw new BadRequestException(ProductErrors.VARIANT_NOT_FOUND);
        basePrice = Number(variant.basePrice);
        variantName = variant.name;
      }

      let optionsTotal = 0;
      const selectedOptions: any[] = [];
      if (itemDto.optionIds?.length) {
        let allOptions = product.optionGroups.flatMap((g) => g.options);
        if (itemDto.variantId) {
          const variant = product.variants.find(
            (v) => v.id === itemDto.variantId,
          );
          if (variant && variant.optionGroups) {
            allOptions = allOptions.concat(
              variant.optionGroups.flatMap((g) => g.options),
            );
          }
        }
        for (const optId of itemDto.optionIds) {
          const opt = allOptions.find((o) => o.id === optId);
          if (!opt)
            throw new BadRequestException(ProductErrors.OPTION_NOT_FOUND);
          optionsTotal += Number(opt.priceAdded);
          selectedOptions.push({
            optionId: opt.id,
            optionName: opt.name,
            priceAdded: Number(opt.priceAdded),
          });
        }
      }

      const unitPrice = basePrice + optionsTotal;
      const totalPrice = unitPrice * itemDto.quantity;
      newSubtotal += totalPrice;

      newItems.push({
        productId: product.id,
        variantId: itemDto.variantId ?? null,
        productName: product.name ?? 'Unknown Product',
        variantName,
        unitPrice,
        quantity: itemDto.quantity,
        totalPrice,
        specialRequest: itemDto.specialRequest ?? null,
        selectedOptions,
      });
    }

    const settings = await this.platformSettings.getSettings();
    const serviceFee =
      order.vendor && !order.vendor.isContracted
        ? Math.round(newSubtotal * (Number(order.vendor.commissionRate) / 100))
        : 0;
    const tax =
      Math.round(newSubtotal * Number(settings.defaultTaxRate) * 100) / 100;
    const grandTotal =
      newSubtotal + Number(order.deliveryFee) + serviceFee + tax;

    await this.prisma.$transaction(async (tx) => {
      // delete old
      await tx.orderItem.deleteMany({ where: { orderId: order.id } });

      // insert new
      // insert new
      const orderItemsData: Prisma.OrderItemCreateManyInput[] = [];
      const orderItemOptionsData: Prisma.OrderItemOptionCreateManyInput[] = [];

      for (const item of newItems) {
        const orderItemId = randomUUID();
        orderItemsData.push({
          id: orderItemId,
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
          specialRequest: item.specialRequest,
        });

        if (item.selectedOptions.length > 0) {
          for (const o of item.selectedOptions) {
            orderItemOptionsData.push({
              orderItemId: orderItemId,
              optionId: o.optionId,
              optionName: o.optionName,
              priceAdded: o.priceAdded,
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

      await tx.order.update({
        where: { id: order.id },
        data: {
          subtotal: newSubtotal,
          serviceFee,
          tax,
          grandTotal,
          status: OrderStatus.CHANGES_REQUESTED,
        },
      });

      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          status: OrderStatus.CHANGES_REQUESTED,
          note: 'Vendor modified order items',
          createdBy: actor.sub,
        },
      });
    });

    const customer = await this.prisma.customer.findUnique({
      where: { id: order.customerId },
      select: { userId: true },
    });
    const vendorUserIds = await this.ordersRepository.getVendorUserIds(
      order.vendorId,
    );

    this.eventEmitter.emit(
      EVENTS.ORDER_STATUS_CHANGED,
      new OrderStatusChangedEvent(
        order.id,
        order.orderNumber,
        order.status as OrderStatus,
        OrderStatus.CHANGES_REQUESTED,
        order.customerId,
        customer?.userId ?? '',
        order.vendorId,
        vendorUserIds,
        order.driverId,
        null,
        actor.sub,
        'Vendor modified order items',
      ),
    );

    return { message: 'Order items updated and awaiting customer approval' };
  }

  async adminPlaceDirectOrder(
    actor: JwtAccessPayload,
    dto: PlaceDirectOrderDto,
  ) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      const isVendorMember = await this.prisma.vendorMember.findUnique({
        where: {
          vendorId_userId: { vendorId: dto.vendorId, userId: actor.sub },
        },
      });
      if (
        !isVendorMember ||
        (isVendorMember.role !== 'OWNER' &&
          isVendorMember.role !== 'STAFF' &&
          isVendorMember.role !== 'MANAGER')
      ) {
        throw new ForbiddenException(OrderErrors.NOT_AUTHORIZED_VENDOR);
      }
    }

    const customer = await this.prisma.customer.findUnique({
      where: { userId: dto.customerId },
    });
    if (!customer) throw new NotFoundException(CustomerErrors.CUSTOMER_NOT_FOUND);

    await this.validateActiveOrderLimit(customer.id);

    const vendor = await this.prisma.vendor.findUnique({
      where: { id: dto.vendorId },
    });
    if (!vendor) throw new NotFoundException(OrderErrors.NOT_AUTHORIZED_VENDOR);

    const settings = await this.platformSettings.getSettings();

    const subtotal = dto.price * (dto.quantity ?? 1);
    const commissionRate = Number(vendor.commissionRate ?? 0) / 100;
    const serviceFee = !vendor.isContracted
      ? Math.round(subtotal * commissionRate)
      : 0;
    const taxRate = Number(settings.defaultTaxRate) / 100;
    const tax = Math.round((subtotal + serviceFee) * taxRate);
    const grandTotal = subtotal + serviceFee + tax;

    const orderId = randomUUID();

    const orderNumber = await this.ordersRepository.generateOrderNumber();
    const orderData: CreateOrderData = {
      orderNumber,
      customerId: customer.id,
      vendorId: dto.vendorId,
      vendorBranchId: null,
      zoneId: null,
      paymentMethod: dto.paymentMethod ?? PaymentMethod.CASH_ON_DELIVERY,
      deliveryAddress: dto.deliveryAddress ?? 'Pending Customer Update',
      deliveryLng: dto.deliveryLocation?.[0] ?? 0,
      deliveryLat: dto.deliveryLocation?.[1] ?? 0,
      subtotal,
      deliveryFee: 0,
      driverBonusFee: 0,
      serviceFee,
      tax,
      discount: 0,
      coinsUsed: 0,
      coinsEarned: 0,
      grandTotal,
      upfrontAmount: 0,
      specialRequest: dto.specialRequest ?? null,
      type: 'DELIVERY',
      distanceKm: 0,
      pickupAddress: null,
      pickupLng: null,
      pickupLat: null,
      itemDetails: null,
      requestedVehicleType: null,
    };

    const itemsData: OrderItemData[] = [
      {
        productId: dto.productId ?? null,
        variantId: null,
        productName: dto.productName ?? 'Custom Item',
        variantName: null,
        unitPrice: dto.price,
        quantity: dto.quantity ?? 1,
        totalPrice: subtotal,
        specialRequest: null,
        options: [],
      },
    ];

    const order = await this.ordersRepository.createOrder(orderData, itemsData, actor.sub);

    // Update the created order's status to CHANGES_REQUESTED (createOrder sets to PENDING/PENDING_PAYMENT by default)
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.CHANGES_REQUESTED }
    });

    // Also update the status event to CHANGES_REQUESTED instead of whatever createOrder created
    await this.prisma.orderStatusEvent.updateMany({
      where: { orderId: order.id },
      data: { status: OrderStatus.CHANGES_REQUESTED, note: 'Order created by Vendor/Admin directly from chat' }
    });

    const vendorUserIds = orderData.vendorId ? await this.ordersRepository.getVendorUserIds(orderData.vendorId) : [];

    this.eventEmitter.emit(
      EVENTS.ORDER_STATUS_CHANGED,
      new OrderStatusChangedEvent(
        order.id,
        orderData.orderNumber,
        OrderStatus.PENDING,
        OrderStatus.CHANGES_REQUESTED,
        orderData.customerId,
        customer.userId,
        orderData.vendorId,
        vendorUserIds,
        null,
        null,
        actor.sub,
        'Order created by Vendor/Admin directly from chat',
      ),
    );

    this.eventEmitter.emit(
      EVENTS.ORDER_CREATED,
      new OrderCreatedEvent(
        order.id,
        orderData.orderNumber,
        orderData.customerId,
        customer.userId,
        orderData.vendorId,
        vendorUserIds,
        orderData.grandTotal,
        orderData.paymentMethod,
        orderData.type
      ),
    );

    return order;
  }

  async acceptOrderChanges(actor: JwtAccessPayload, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { driver: true, customer: true },
    });
    if (!order) throw new NotFoundException(OrderErrors.NOT_FOUND);
    if (order.customer.userId !== actor.sub)
      throw new ForbiddenException(OrderErrors.NOT_AUTHORIZED_VIEW);
    if (order.status !== OrderStatus.CHANGES_REQUESTED)
      throw new BadRequestException(OrderErrors.NO_PENDING_CHANGES);

    const nextStatus =
      order.paymentMethod === 'MOBILE_WALLET'
        ? OrderStatus.PENDING_PAYMENT
        : OrderStatus.DRIVER_ASSIGNED;

    const updated = await this.ordersRepository.updateStatus(
      orderId,
      nextStatus,
      actor.sub,
      'Customer approved order changes',
      {},
      OrderStatus.CHANGES_REQUESTED,
    );

    const vendorUserIds = await this.ordersRepository.getVendorUserIds(
      order.vendorId,
    );
    const driverUserId = order.driver?.userId ?? null;

    this.eventEmitter.emit(
      EVENTS.ORDER_STATUS_CHANGED,
      new OrderStatusChangedEvent(
        order.id,
        order.orderNumber,
        OrderStatus.CHANGES_REQUESTED,
        nextStatus,
        order.customerId,
        actor.sub,
        order.vendorId,
        vendorUserIds,
        order.driverId,
        driverUserId,
        actor.sub,
        'Customer approved order changes',
      ),
    );
    return { message: 'Order changes accepted' };
  }

  async rejectOrderChanges(actor: JwtAccessPayload, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { driver: true, customer: true },
    });
    if (!order) throw new NotFoundException(OrderErrors.NOT_FOUND);
    if (order.customer.userId !== actor.sub)
      throw new ForbiddenException(OrderErrors.NOT_AUTHORIZED_VIEW);
    if (order.status !== OrderStatus.CHANGES_REQUESTED)
      throw new BadRequestException(OrderErrors.NO_PENDING_CHANGES);

    const updated = await this.ordersRepository.updateStatus(
      orderId,
      OrderStatus.CANCELLED,
      actor.sub,
      'Customer rejected order changes',
      {},
      OrderStatus.CHANGES_REQUESTED,
    );

    const vendorUserIds = await this.ordersRepository.getVendorUserIds(
      order.vendorId,
    );
    const driverUserId = order.driver?.userId ?? null;

    this.eventEmitter.emit(
      EVENTS.ORDER_STATUS_CHANGED,
      new OrderStatusChangedEvent(
        order.id,
        order.orderNumber,
        OrderStatus.CHANGES_REQUESTED,
        OrderStatus.CANCELLED,
        order.customerId,
        actor.sub,
        order.vendorId,
        vendorUserIds,
        order.driverId,
        driverUserId,
        actor.sub,
        'Customer rejected order changes',
      ),
    );

    this.eventEmitter.emit(
      EVENTS.ORDER_CANCELLED,
      new OrderCancelledEvent(
        order.id,
        order.orderNumber,
        order.customerId,
        actor.sub,
        order.vendorId,
        vendorUserIds,
        order.driverId,
        driverUserId,
        'Customer rejected order changes',
        actor.sub,
      ),
    );
    return { message: 'Order changes rejected and order cancelled' };
  }


  private async validateActiveOrderLimit(customerId: string) {
    const settings = await this.platformSettings.getSettings();

    // 1. Get the current active order count
    const activeCount = await this.prisma.order.count({
      where: {
        customerId,
        status: { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] },
      },
    });

    // Fast path: if 0 active orders, they are always allowed to place a new one
    if (activeCount === 0) return;

    if (activeCount >= settings.maxActiveOrdersPerCustomer) {
      throw new BadRequestException(OrderErrors.MAX_ACTIVE_ORDERS_REACHED);
    }

    if (settings.requirePriorDeliveryForMultipleOrders) {
      const hasCompletedOrder = await this.prisma.order.findFirst({
        where: {
          customerId,
          status: OrderStatus.DELIVERED,
        },
        select: { id: true },
      });

      if (!hasCompletedOrder) {
        throw new BadRequestException(OrderErrors.MAX_ACTIVE_ORDERS_REACHED);
      }
    }
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
