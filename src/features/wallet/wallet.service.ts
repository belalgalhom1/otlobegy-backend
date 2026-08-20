import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  WalletErrors,
  DriverErrors,
} from 'src/common/constants/response.constants';
import {
  CreateMobileWalletDto,
  CreateWalletTopUpDto,
  ReviewWalletTopUpDto,
  ProcessManualTransactionDto,
} from './dto/wallet.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VendorTransactionType, WalletTransactionType } from '@prisma/client';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { CommonSuccess } from 'src/common/constants/response.constants';
import { DriverStatusChangedEvent } from 'src/common/events';
import { EVENTS } from 'src/common/events/event-names';
import { DriverStatus } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly storage: StorageService,
  ) {}

  // ─── Admin: Manage Platform Wallets ───────────────────────────────────────

  async createPlatformWallet(dto: CreateMobileWalletDto) {
    return this.prisma.mobileWallet.create({
      data: {
        number: dto.number,
        type: dto.type,
        isActive: dto.isActive ?? true,
        isPlatform: true,
      },
    });
  }

  async getPlatformWallets(includeInactive = false) {
    return this.prisma.mobileWallet.findMany({
      where: {
        isPlatform: true,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePlatformWallet(id: string, dto: Partial<CreateMobileWalletDto>) {
    const wallet = await this.prisma.mobileWallet.findUnique({
      where: { id, isPlatform: true },
    });
    if (!wallet)
      throw new NotFoundException(WalletErrors.PLATFORM_WALLET_NOT_FOUND);

    return this.prisma.mobileWallet.update({
      where: { id },
      data: dto,
    });
  }

  // ─── Driver: Personal Wallets ─────────────────────────────────────────────

  async addDriverWallet(driverUserId: string, dto: CreateMobileWalletDto) {
    const driver = await this.getDriver(driverUserId);
    return this.prisma.mobileWallet.create({
      data: {
        number: dto.number,
        type: dto.type,
        isActive: dto.isActive ?? true,
        isPlatform: false,
        driverId: driver.id,
      },
    });
  }

  async getDriverWallets(driverUserId: string) {
    const driver = await this.getDriver(driverUserId);
    return this.prisma.mobileWallet.findMany({
      where: { driverId: driver.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Driver: Top-Up Requests ──────────────────────────────────────────────

  async submitTopUpRequest(driverUserId: string, dto: CreateWalletTopUpDto) {
    const driver = await this.getDriver(driverUserId);

    const platformWallet = await this.prisma.mobileWallet.findUnique({
      where: { id: dto.platformWalletId, isPlatform: true, isActive: true },
    });
    if (!platformWallet)
      throw new NotFoundException(
        WalletErrors.PLATFORM_WALLET_NOT_FOUND_OR_INACTIVE,
      );

    const request = await this.prisma.walletTopUpRequest.create({
      data: {
        driverId: driver.id,
        platformWalletId: platformWallet.id,
        amount: dto.amount,
        receiptUrl: dto.receiptUrl,
        status: 'PENDING',
      },
    });

    return request;
  }

  async getMyTopUpRequests(driverUserId: string) {
    const driver = await this.getDriver(driverUserId);
    return this.prisma.walletTopUpRequest.findMany({
      where: { driverId: driver.id },
      include: { platformWallet: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadReceipt(file: Express.Multer.File) {
    const receiptUrl = await this.storage.upload(file, 'receipts');
    return { receiptUrl, message: CommonSuccess.RESOURCE_UPDATED };
  }

  // ─── Admin: Review Top-Ups ────────────────────────────────────────────────

  async getPendingTopUpRequests() {
    return this.prisma.walletTopUpRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        driver: {
          include: { user: { select: { id: true, name: true, phone: true } } },
        },
        platformWallet: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async reviewTopUpRequest(
    actorUserId: string,
    requestId: string,
    dto: ReviewWalletTopUpDto,
  ) {
    const request = await this.prisma.walletTopUpRequest.findUnique({
      where: { id: requestId },
      include: { driver: true },
    });

    if (!request) throw new NotFoundException(WalletErrors.REQUEST_NOT_FOUND);
    if (request.status !== 'PENDING')
      throw new BadRequestException(WalletErrors.REQUEST_ALREADY_PROCESSED);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedCount = await tx.walletTopUpRequest.updateMany({
        where: { id: requestId, status: 'PENDING' },
        data: { status: dto.status, approvedById: actorUserId },
      });

      if (updatedCount.count === 0) {
        throw new BadRequestException(WalletErrors.REQUEST_ALREADY_PROCESSED);
      }

      const updated = await tx.walletTopUpRequest.findUnique({
        where: { id: requestId },
      });

      if (dto.status === 'APPROVED') {
        // Unblock the driver when approved!
        let statusUpdate = {};
        if (request.driver?.status === DriverStatus.SUSPENDED) {
          statusUpdate = { status: DriverStatus.OFFLINE };
        }
        await tx.driver.update({
          where: { id: request.driverId },
          data: {
            hasUnpaidCommission: false,
            ...statusUpdate,
          },
        });

        // Update driver's total wallet balance FIRST
        const updatedDriver = await tx.driver.update({
          where: { id: request.driverId },
          data: { walletBalance: { increment: request.amount } },
          select: { walletBalance: true, userId: true },
        });

        // Also add a positive wallet transaction for the payment amount
        await tx.driverWalletTransaction.create({
          data: {
            driverId: request.driverId,
            type: 'ADJUSTMENT', // Or we could add a TOP_UP enum
            amount: request.amount,
            balanceAfter: updatedDriver.walletBalance,
            description: 'Approved Top-up transfer',
            referenceId: request.id,
          },
        });
      }

      return updated;
    });

    // Send notifications after transaction succeeds
    if (dto.status === 'APPROVED') {
      if (request.driver?.status === DriverStatus.SUSPENDED) {
         this.eventEmitter.emit(
          EVENTS.DRIVER_STATUS_CHANGED,
          new DriverStatusChangedEvent(
            request.driver.id,
            request.driver.userId,
            DriverStatus.SUSPENDED,
            DriverStatus.OFFLINE,
            'UNPAID_COMMISSION_SETTLED',
          ),
        );
      }
    }

    return {
      message: CommonSuccess.RESOURCE_UPDATED,
      data: result,
    };
  }

  // ─── Admin: Manual Transactions ───────────────────────────────────────────

  async processVendorTransaction(
    vendorId: string,
    dto: ProcessManualTransactionDto,
  ) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });
    if (!vendor) throw new NotFoundException(WalletErrors.VENDOR_NOT_FOUND);

    return this.prisma.$transaction(async (tx) => {
      const updatedVendor = await tx.vendor.update({
        where: { id: vendorId },
        data: { walletBalance: { increment: dto.amount } },
        select: { walletBalance: true },
      });

      return tx.vendorWalletTransaction.create({
        data: {
          vendorId,
          type: dto.type as VendorTransactionType,
          amount: dto.amount,
          balanceAfter: updatedVendor.walletBalance,
          description: dto.description || 'Manual Admin Transaction',
          orderId: dto.referenceId,
        },
      });
    });
  }

  async processDriverTransaction(
    driverId: string,
    dto: ProcessManualTransactionDto,
  ) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });
    if (!driver) throw new NotFoundException(WalletErrors.DRIVER_NOT_FOUND);

    return this.prisma.$transaction(async (tx) => {
      const updatedDriver = await tx.driver.update({
        where: { id: driverId },
        data: { walletBalance: { increment: dto.amount } },
        select: { walletBalance: true },
      });

      return tx.driverWalletTransaction.create({
        data: {
          driverId,
          type: dto.type as WalletTransactionType,
          amount: dto.amount,
          balanceAfter: updatedDriver.walletBalance,
          description: dto.description || 'Manual Admin Transaction',
          orderId: dto.referenceId,
        },
      });
    });
  }

  // ─── Transaction History ──────────────────────────────────────────────────

  async getVendorTransactions(vendorId: string, skip = 0, take = 50) {
    return this.prisma.vendorWalletTransaction.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async getDriverTransactions(driverId: string, skip = 0, take = 50) {
    return this.prisma.driverWalletTransaction.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async getDriver(userId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    if (!driver) throw new NotFoundException(DriverErrors.PROFILE_NOT_FOUND);
    return driver;
  }
}
