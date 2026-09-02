import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import {
  CreateAddressDto,
  UpdateAddressDto,
  QueryCustomersDto,
  QueryCustomerOrdersDto,
} from './dto/customer.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { Permission, Role } from '@prisma/client';
import { ApiStandardResponse, ApiPaginatedResponse, ApiArrayResponse } from 'src/common/decorators/api-response.decorator';
import { CustomerResponseDto } from 'src/common/dto/response-models.dto';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // SELF-SERVICE  — /customers/me/*  (CUSTOMER role only)
  // ═══════════════════════════════════════════════════════════════════════════

  @ApiStandardResponse()
  @Get('me/addresses')
  @Roles(Role.CUSTOMER, Role.ADMIN, Role.SUPER_ADMIN, Role.VENDOR_MEMBER)
  @ApiOperation({ summary: 'Get my addresses' })
  getAddresses(@CurrentUser('sub') userId: string) {
    return this.customersService.getAddresses(userId);
  }

  @ApiStandardResponse()
  @Post('me/addresses')
  @Roles(Role.CUSTOMER, Role.ADMIN, Role.SUPER_ADMIN, Role.VENDOR_MEMBER)
  @ApiOperation({ summary: 'Add a new address' })
  createAddress(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.customersService.createAddress(userId, dto);
  }

  @ApiStandardResponse()
  @Patch('me/addresses/:id')
  @Roles(Role.CUSTOMER, Role.ADMIN, Role.SUPER_ADMIN, Role.VENDOR_MEMBER)
  @ApiOperation({ summary: 'Update an address' })
  updateAddress(
    @CurrentUser('sub') userId: string,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.customersService.updateAddress(userId, addressId, dto);
  }

  @ApiStandardResponse()
  @Delete('me/addresses/:id')
  @Roles(Role.CUSTOMER, Role.ADMIN, Role.SUPER_ADMIN, Role.VENDOR_MEMBER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an address' })
  deleteAddress(
    @CurrentUser('sub') userId: string,
    @Param('id') addressId: string,
  ) {
    return this.customersService.deleteAddress(userId, addressId);
  }

  @ApiStandardResponse()
  @Get('me/favorites')
  @Roles(Role.CUSTOMER, Role.ADMIN, Role.SUPER_ADMIN, Role.VENDOR_MEMBER)
  @ApiOperation({ summary: 'Get my favorites (vendors + products)' })
  getFavorites(@CurrentUser('sub') userId: string) {
    return this.customersService.getFavorites(userId);
  }

  @ApiStandardResponse()
  @Post('me/favorites/vendors/:vendorId')
  @Roles(Role.CUSTOMER, Role.ADMIN, Role.SUPER_ADMIN, Role.VENDOR_MEMBER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle vendor favorite' })
  toggleFavoriteVendor(
    @CurrentUser('sub') userId: string,
    @Param('vendorId') vendorId: string,
  ) {
    return this.customersService.toggleFavoriteVendor(userId, vendorId);
  }

  @ApiStandardResponse()
  @Post('me/favorites/products/:productId')
  @Roles(Role.CUSTOMER, Role.ADMIN, Role.SUPER_ADMIN, Role.VENDOR_MEMBER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle product favorite' })
  toggleFavoriteProduct(
    @CurrentUser('sub') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.customersService.toggleFavoriteProduct(userId, productId);
  }

  @ApiStandardResponse()
  @Get('me/coins/history')
  @Roles(Role.CUSTOMER, Role.ADMIN, Role.SUPER_ADMIN, Role.VENDOR_MEMBER)
  @ApiOperation({ summary: 'Get coin transaction history' })
  getCoinHistory(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customersService.getCoinHistory(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN  — /customers/*  (MANAGE_CUSTOMERS)
  // Same pattern as VendorsController, TicketsController, etc.
  // ═══════════════════════════════════════════════════════════════════════════

  @ApiStandardResponse()
  @Get()
  @RequirePermissions(Permission.MANAGE_CUSTOMERS)
  @ApiOperation({
    summary:
      '[Admin] List all customers — filter by canOrder, includeDeleted, search',
  })
  adminFindAll(@Query() dto: QueryCustomersDto) {
    return this.customersService.adminFindAll(dto);
  }

  @ApiStandardResponse()
  @Get('by-user/:userId')
  @RequirePermissions(Permission.MANAGE_CUSTOMERS)
  @ApiOperation({ summary: '[Admin] Get a customer by their userId' })
  adminFindByUserId(@Param('userId') userId: string) {
    return this.customersService.adminFindByUserId(userId);
  }

  @ApiStandardResponse()
  @Get(':customerId')
  @RequirePermissions(Permission.MANAGE_CUSTOMERS)
  @ApiOperation({
    summary: '[Admin] Get a customer — includes counts + last 5 orders',
  })
  adminFindOne(@Param('customerId') customerId: string) {
    return this.customersService.adminFindOne(customerId);
  }

  @ApiStandardResponse()
  @Post(':customerId/enable-ordering')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.MANAGE_CUSTOMERS)
  @ApiOperation({
    summary: '[Admin] Allow customer to place orders (canOrder → true)',
  })
  adminEnableOrdering(@Param('customerId') customerId: string) {
    return this.customersService.adminSetCanOrder(customerId, true);
  }

  @ApiStandardResponse()
  @Post(':customerId/disable-ordering')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.MANAGE_CUSTOMERS)
  @ApiOperation({
    summary: '[Admin] Prevent customer from placing orders (canOrder → false)',
  })
  adminDisableOrdering(@Param('customerId') customerId: string) {
    return this.customersService.adminSetCanOrder(customerId, false);
  }

  @ApiStandardResponse()
  @Get(':customerId/addresses')
  @RequirePermissions(Permission.MANAGE_CUSTOMERS)
  @ApiOperation({ summary: "[Admin] List a customer's saved addresses" })
  adminGetAddresses(@Param('customerId') customerId: string) {
    return this.customersService.adminGetAddresses(customerId);
  }

  @ApiStandardResponse()
  @Get(':customerId/orders')
  @RequirePermissions(Permission.MANAGE_CUSTOMERS)
  @ApiOperation({
    summary: "[Admin] List a customer's full order history (paginated)",
  })
  adminGetOrders(
    @Param('customerId') customerId: string,
    @Query() dto: QueryCustomerOrdersDto,
  ) {
    return this.customersService.adminGetOrders(customerId, dto);
  }

  @ApiStandardResponse()
  @Delete(':customerId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.MANAGE_CUSTOMERS)
  @ApiOperation({
    summary:
      '[Admin] Hard-delete a customer (cascades to addresses, carts, favorites). Parent User is untouched.',
  })
  adminRemove(@Param('customerId') customerId: string) {
    return this.customersService.adminRemove(customerId);
  }
}
