import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  UploadedFile,
} from '@nestjs/common';
import { ApiFileUpload } from 'src/common/decorators/api-file-upload.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import {
  CreateMobileWalletDto,
  CreateWalletTopUpDto,
  ReviewWalletTopUpDto,
  ProcessManualTransactionDto,
} from './dto/wallet.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { VendorMember } from 'src/common/decorators/vendor-member.decorator';
import { Role, Permission, VendorMemberRole } from '@prisma/client';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';
import { JwtAccessPayload } from 'src/common/interfaces/jwt-payload.interface';
import { MobileWallet } from '../../_gen/prisma-classes/mobile_wallet';
import { WalletTopUpRequest } from '../../_gen/prisma-classes/wallet_top_up_request';
import { VendorWalletTransaction } from '../../_gen/prisma-classes/vendor_wallet_transaction';
import { DriverWalletTransaction } from '../../_gen/prisma-classes/driver_wallet_transaction';


@ApiTags('Wallet & Financials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // ─── Admin: Manual Transactions ───────────────────────────────────────────

  @ApiStandardResponse(VendorWalletTransaction)
  @Post('admin/vendors/:vendorId/transaction')
  @Roles(Role.ADMIN)
  @RequirePermissions(Permission.MANAGE_FINANCE)
  @ApiOperation({
    summary: 'Manually adjust vendor wallet (Payout, Refund, etc.)',
  })
  processVendorTransaction(
    @Param('vendorId') vendorId: string,
    @Body() dto: ProcessManualTransactionDto,
  ) {
    return this.walletService.processVendorTransaction(vendorId, dto);
  }

  @ApiStandardResponse(DriverWalletTransaction)
  @Post('admin/drivers/:driverId/transaction')
  @Roles(Role.ADMIN)
  @RequirePermissions(Permission.MANAGE_FINANCE)
  @ApiOperation({
    summary: 'Manually adjust driver wallet (Payout, Penalty, etc.)',
  })
  processDriverTransaction(
    @Param('driverId') driverId: string,
    @Body() dto: ProcessManualTransactionDto,
  ) {
    return this.walletService.processDriverTransaction(driverId, dto);
  }

  // ─── Admin Endpoints ────────────────────────────────────────────────────────

  @ApiStandardResponse(MobileWallet)
  @Post('platform')
  @Roles(Role.ADMIN)
  @RequirePermissions(Permission.MANAGE_FINANCE)
  @ApiOperation({ summary: 'Add a new platform receiving wallet' })
  createPlatformWallet(@Body() dto: CreateMobileWalletDto) {
    return this.walletService.createPlatformWallet(dto);
  }

  @ApiStandardResponse(MobileWallet)
  @Get('platform/all')
  @Roles(Role.ADMIN)
  @RequirePermissions(Permission.MANAGE_FINANCE)
  @ApiOperation({ summary: 'Get all platform wallets (including inactive)' })
  getAllPlatformWallets() {
    return this.walletService.getPlatformWallets(true);
  }

  @ApiStandardResponse(MobileWallet)
  @Patch('platform/:id')
  @Roles(Role.ADMIN)
  @RequirePermissions(Permission.MANAGE_FINANCE)
  @ApiOperation({ summary: 'Update or disable a platform wallet' })
  updatePlatformWallet(
    @Param('id') id: string,
    @Body() dto: Partial<CreateMobileWalletDto>,
  ) {
    return this.walletService.updatePlatformWallet(id, dto);
  }

  @ApiStandardResponse(WalletTopUpRequest)
  @Get('topups/pending')
  @Roles(Role.ADMIN)
  @RequirePermissions(Permission.MANAGE_FINANCE) // Or manage_drivers
  @ApiOperation({ summary: 'View pending driver top-up requests' })
  getPendingTopUps() {
    return this.walletService.getPendingTopUpRequests();
  }

  @ApiStandardResponse(WalletTopUpRequest)
  @Patch('topups/:id/review')
  @Roles(Role.ADMIN)
  @RequirePermissions(Permission.MANAGE_FINANCE)
  @ApiOperation({ summary: 'Approve or reject a driver top-up request' })
  reviewTopUp(
    @Request() req: { user: JwtAccessPayload },
    @Param('id') id: string,
    @Body() dto: ReviewWalletTopUpDto,
  ) {
    return this.walletService.reviewTopUpRequest(req.user.sub, id, dto);
  }

  // ─── Shared Endpoints (Driver / Customer) ───────────────────────────────

  @ApiStandardResponse(MobileWallet)
  @Get('platform')
  @ApiOperation({ summary: 'Get active platform wallets to send money to' })
  getActivePlatformWallets() {
    // Drivers use this to know where to send commission
    return this.walletService.getPlatformWallets(false);
  }

  // ─── Vendor Endpoints ───────────────────────────────────────────────────────

  @ApiStandardResponse(VendorWalletTransaction)
  @Get('vendors/:vendorId/transactions')
  @VendorMember({ roles: [VendorMemberRole.OWNER, VendorMemberRole.MANAGER] })
  @ApiOperation({ summary: 'Get vendor wallet transaction history' })
  getVendorTransactions(@Param('vendorId') vendorId: string) {
    return this.walletService.getVendorTransactions(vendorId);
  }

  // ─── Driver Endpoints ───────────────────────────────────────────────────────

  @ApiStandardResponse(DriverWalletTransaction)
  @Get('driver/me/transactions')
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'Get my personal driver wallet transactions' })
  getMyDriverTransactions(@Request() req: { user: JwtAccessPayload }) {
    return this.walletService.getDriverTransactions(req.user.sub);
  }

  @ApiStandardResponse(MobileWallet)
  @Post('driver')
  @Roles(Role.DRIVER)
  @ApiOperation({
    summary: 'Add personal driver wallet for receiving money from customers',
  })
  addDriverWallet(
    @Request() req: { user: JwtAccessPayload },
    @Body() dto: CreateMobileWalletDto,
  ) {
    return this.walletService.addDriverWallet(req.user.sub, dto);
  }

  @ApiStandardResponse(MobileWallet)
  @Get('driver')
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'Get my personal driver wallets' })
  getMyDriverWallets(@Request() req: { user: JwtAccessPayload }) {
    return this.walletService.getDriverWallets(req.user.sub);
  }

  @ApiStandardResponse(WalletTopUpRequest)
  @Post('topups')
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'Submit a top-up request with screenshot proof' })
  submitTopUpRequest(
    @Request() req: { user: JwtAccessPayload },
    @Body() dto: CreateWalletTopUpDto,
  ) {
    return this.walletService.submitTopUpRequest(req.user.sub, dto);
  }

  @ApiStandardResponse(WalletTopUpRequest)
  @Get('topups/me')
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'View my top-up requests history' })
  getMyTopUpRequests(@Request() req: { user: JwtAccessPayload }) {
    return this.walletService.getMyTopUpRequests(req.user.sub);
  }
  @ApiStandardResponse()
  @Post('topups/receipt')
  @Roles(Role.DRIVER)
  @ApiFileUpload({ type: 'IMAGE', required: true })
  @ApiOperation({ summary: 'Upload a receipt image for a wallet top-up' })
  uploadReceipt(
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.walletService.uploadReceipt(file);
  }
}
