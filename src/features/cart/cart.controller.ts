import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';

import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Cart')
@ApiBearerAuth()
@Roles(Role.CUSTOMER, Role.SUPER_ADMIN)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @ApiStandardResponse()
  @Get()
  @ApiOperation({ summary: 'Get all my carts (one per vendor)' })
    getMyCarts(@CurrentUser('sub') userId: string) {
    return this.cartService.getMyCarts(userId);
  }

  @ApiStandardResponse()
  @Get(':vendorId')
  @ApiOperation({ summary: 'Get cart for a specific vendor' })
    getCart(
    @CurrentUser('sub') userId: string,
    @Param('vendorId') vendorId: string,
  ) {
    return this.cartService.getCart(userId, vendorId);
  }

  @ApiStandardResponse()
  @Post(':vendorId/items')
  @ApiOperation({ summary: 'Add item to cart' })
    addItem(
    @CurrentUser('sub') userId: string,
    @Param('vendorId') vendorId: string,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(userId, vendorId, dto);
  }

  @ApiStandardResponse()
  @Patch(':vendorId/items/:itemId')
  @ApiOperation({ summary: 'Update cart item (quantity / options)' })
    updateItem(
    @CurrentUser('sub') userId: string,
    @Param('vendorId') vendorId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(userId, vendorId, itemId, dto);
  }

  @ApiStandardResponse()
  @Delete(':vendorId/items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove item from cart' })
  removeItem(
    @CurrentUser('sub') userId: string,
    @Param('vendorId') vendorId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.cartService.removeItem(userId, vendorId, itemId);
  }

  @ApiStandardResponse()
  @Delete(':vendorId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear entire cart for a vendor' })
    clearCart(
    @CurrentUser('sub') userId: string,
    @Param('vendorId') vendorId: string,
  ) {
    return this.cartService.clearCart(userId, vendorId);
  }
}
