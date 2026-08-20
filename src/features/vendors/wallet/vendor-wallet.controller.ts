import { Controller, Get, Query, Param } from '@nestjs/common';
import { VendorWalletService } from './vendor-wallet.service';
import { QueryVendorWalletDto } from './dto/vendor-wallet.dto';
import { VendorMember } from '../../../common/decorators/vendor-member.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../../common/decorators/api-response.decorator';


@ApiTags('Vendors - Wallet & Transactions')
@ApiBearerAuth()
@Controller('vendors/:vendorId/wallet')
export class VendorWalletController {
  constructor(private readonly service: VendorWalletService) {}

  // Any vendor member can see their own wallet balance.
  @ApiStandardResponse()
  @Get('balance')
  @VendorMember()
  @ApiOperation({ summary: 'Get vendor wallet balance (Member)' })
  getBalance(@Param('vendorId') vendorId: string) {
    return this.service.getBalance(vendorId);
  }

  // Any vendor member can see transaction history.
  @ApiStandardResponse()
  @Get('transactions')
  @VendorMember()
  @ApiOperation({ summary: 'List vendor wallet transactions (Member)' })
  listTransactions(
    @Param('vendorId') vendorId: string,
    @Query() dto: QueryVendorWalletDto,
  ) {
    return this.service.listTransactions(vendorId, dto);
  }

  // Admin can view any vendor's wallet.
  @ApiStandardResponse()
  @Get('admin/balance')
  @RequirePermissions(Permission.VIEW_FINANCIALS)
  @ApiOperation({ summary: "Get any vendor's wallet balance (Admin)" })
  adminGetBalance(@Param('vendorId') vendorId: string) {
    return this.service.getBalance(vendorId);
  }

  @ApiStandardResponse()
  @Get('admin/transactions')
  @RequirePermissions(Permission.VIEW_FINANCIALS)
  @ApiOperation({ summary: "List any vendor's wallet transactions (Admin)" })
  adminListTransactions(
    @Param('vendorId') vendorId: string,
    @Query() dto: QueryVendorWalletDto,
  ) {
    return this.service.listTransactions(vendorId, dto);
  }
}
