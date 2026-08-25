import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { DispatchService } from '../dispatch/dispatch.service';
import {
  PlaceOrderDto,
  UpdateOrderStatusDto,
  QueryOrdersDto,
  RespondToDispatchDto,
  AdminAssignDriverDto,
  PlaceCustomOrderDto,
  EditOrderItemsDto,
  PlaceDirectOrderDto,
  ConfirmPaymentDto,
} from './dto/order.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import type { JwtAccessPayload } from 'src/common/interfaces/jwt-payload.interface';
import { Permission, Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';
import { Order } from '../../_gen/prisma-classes/order';
import { OrderDispatch } from '../../_gen/prisma-classes/order_dispatch';


@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly dispatchService: DispatchService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMER
  // ═══════════════════════════════════════════════════════════════════════════

  @ApiStandardResponse(Order)
  @Post()
  @Roles(Role.CUSTOMER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Place a new order from active cart' })
  placeOrder(
    @CurrentUser() actor: JwtAccessPayload,
    @Body() dto: PlaceOrderDto,
  ) {
    return this.checkoutService.placeOrder(actor, dto);
  }


  @ApiStandardResponse(Order)
  @Post('custom')
  @Roles(Role.CUSTOMER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Place a custom delivery or ride order' })
  placeCustomOrder(
    @CurrentUser() actor: JwtAccessPayload,
    @Body() dto: PlaceCustomOrderDto,
  ) {
    return this.checkoutService.placeCustomOrder(actor, dto);
  }

  @ApiStandardResponse(Order)
  @Get('my')
  @Roles(Role.CUSTOMER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get my order history (customer)' })
  getMyOrdersAsCustomer(
    @CurrentUser() actor: JwtAccessPayload,
    @Query() dto: QueryOrdersDto,
  ) {
    return this.ordersService.getMyOrdersAsCustomer(actor, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DRIVER
  // ═══════════════════════════════════════════════════════════════════════════

  @ApiStandardResponse(Order)
  @Get('driver/my')
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'Get my orders as driver' })
  getMyOrdersAsDriver(
    @CurrentUser() actor: JwtAccessPayload,
    @Query() dto: QueryOrdersDto,
  ) {
    return this.ordersService.getMyOrdersAsDriver(actor, dto);
  }

  @ApiStandardResponse(OrderDispatch)
  @Get('driver/dispatches')
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'Get my pending dispatch requests' })
  getMyDispatches(@CurrentUser() actor: JwtAccessPayload) {
    return this.dispatchService.getPendingForDriver(actor.sub);
  }

  @ApiStandardResponse(Order)
  @Post('driver/dispatches/:dispatchId/respond')
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept or reject a dispatch request' })
  respondToDispatch(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('dispatchId') dispatchId: string,
    @Body() dto: RespondToDispatchDto,
  ) {
    return this.stateService.respondToDispatch(actor, dispatchId, dto);
  }

  // ─── Mobile Wallet Payment Endpoints ───────────────────────────────────────

  @ApiStandardResponse(Order)
  @Post('customer/:orderId/payment/mark-paid')
  @Roles(Role.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer marks mobile wallet payment as paid' })
  customerMarkPaid(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentService.customerMarkPaid(actor, orderId);
  }

  @ApiStandardResponse(Order)
  @Post('driver/:orderId/payment/confirm')
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Driver confirms or denies receiving mobile wallet payment',
  })
  driverConfirmPayment(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('orderId') orderId: string,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.paymentService.driverConfirmPayment(actor, orderId, dto.received);
  }

  @ApiStandardResponse(Order)
  @Patch('driver/:orderId/status')
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Driver updates order status (PICKED_UP / DELIVERED)',
  })
  driverUpdateStatus(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.stateService.driverUpdateStatus(actor, orderId, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VENDOR
  // ═══════════════════════════════════════════════════════════════════════════

  @ApiStandardResponse(Order)
  @Get('vendor/:vendorId')
  @Roles(Role.VENDOR_MEMBER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get orders for a vendor (vendor member or admin)' })
  getVendorOrders(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('vendorId') vendorId: string,
    @Query() dto: QueryOrdersDto,
  ) {
    return this.ordersService.getVendorOrders(actor, vendorId, dto);
  }

  @ApiStandardResponse(Order)
  @Patch('vendor/:orderId/status')
  @Roles(Role.VENDOR_MEMBER, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vendor updates order status' })
  vendorUpdateStatus(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.stateService.vendorUpdateStatus(actor, orderId, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARED
  // ═══════════════════════════════════════════════════════════════════════════

  @ApiStandardResponse(Order)
  @Get(':orderId')
  @ApiOperation({
    summary: 'Get a single order (customer/driver/vendor/admin)',
  })
  getOne(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('orderId') orderId: string,
  ) {
    return this.ordersService.getOne(actor, orderId);
  }

  @ApiStandardResponse(Order)
  @Post(':orderId/approve-fee')
  @Roles(Role.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer approves the final delivery fee (Standby Flow)' })
  approveOrderFee(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentService.approveOrderFee(actor, orderId);
  }

  @ApiStandardResponse(Order)
  @Post(':orderId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an order (customer or vendor)' })
  cancelOrder(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('orderId') orderId: string,
    @Body('reason') reason?: string,
  ) {
    return this.stateService.cancelOrder(
      actor,
      orderId,
      reason ?? 'Cancelled by user',
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN
  // ═══════════════════════════════════════════════════════════════════════════

  @ApiStandardResponse(Order)
  @Get()
  @RequirePermissions(Permission.MANAGE_ORDERS)
  @ApiOperation({ summary: '[Admin] List all orders with filters' })
  adminFindAll(@Query() dto: QueryOrdersDto) {
    return this.ordersService.adminFindAll(dto);
  }

  @ApiStandardResponse(Order)
  @Post(':orderId/assign-driver')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.MANAGE_ORDERS)
  @ApiOperation({ summary: '[Admin] Force-assign a driver to an order' })
  adminForceAssignDriver(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('orderId') orderId: string,
    @Body() dto: AdminAssignDriverDto,
  ) {
    return this.stateService.adminForceAssignDriver(actor, orderId, dto);
  }

  // ─── Order Item Modifications & Direct Orders ────────────────────────────────

  @ApiStandardResponse(Order)
  @Post('admin/direct')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR_MEMBER)
  @ApiOperation({
    summary: '[Admin/Vendor] Create a pending order directly for a customer',
  })
  adminPlaceDirectOrder(
    @CurrentUser() actor: JwtAccessPayload,
    @Body() dto: PlaceDirectOrderDto,
  ) {
    return this.checkoutService.adminPlaceDirectOrder(actor, dto);
  }

  @ApiStandardResponse(Order)
  @Patch(':id/items')
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDOR_MEMBER')
  async editOrderItems(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('id') orderId: string,
    @Body() dto: EditOrderItemsDto,
  ) {
    return this.checkoutService.editOrderItems(actor, orderId, dto);
  }

  @ApiStandardResponse(Order)
  @Post(':id/accept-changes')
  @Roles('CUSTOMER')
  @HttpCode(HttpStatus.OK)
  async acceptOrderChanges(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('id') orderId: string,
  ) {
    return this.checkoutService.acceptOrderChanges(actor, orderId);
  }

  @ApiStandardResponse(Order)
  @Post(':id/reject-changes')
  @Roles('CUSTOMER')
  @HttpCode(HttpStatus.OK)
  async rejectOrderChanges(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('id') orderId: string,
  ) {
    return this.checkoutService.rejectOrderChanges(actor, orderId);
  }
}
