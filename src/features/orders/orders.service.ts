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
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly prisma: PrismaService,
  ) {}

async getMyOrdersAsCustomer(actor: JwtAccessPayload, dto: QueryOrdersDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId: actor.sub },
      select: { id: true },
    });
    if (!customer)
      return { orders: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    return this.ordersRepository.findMany({ ...dto, customerId: customer.id });
  }

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

async getMyOrdersAsDriver(actor: JwtAccessPayload, dto: QueryOrdersDto) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId: actor.sub },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException(DriverErrors.PROFILE_NOT_FOUND);
    return this.ordersRepository.findMany({ ...dto, driverId: driver.id });
  }

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

async adminFindAll(dto: QueryOrdersDto) {
    return this.ordersRepository.findMany(dto);
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
