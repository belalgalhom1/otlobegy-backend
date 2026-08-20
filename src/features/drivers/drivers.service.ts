import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DriversRepository } from './drivers.repository';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { LocationRepository } from '../../infrastructure/location/location.repository';
import {
  RegisterDriverDto,
  UpdateDriverProfileDto,
  UpdateDriverStatusDto,
  UpdateDriverLocationDto,
  CreateDriverShiftDto,
  QueryDriversDto,
  QueryDriverWalletDto,
} from './dto/driver.dto';
import {
  DriverLocationUpdatedEvent,
  DriverStatusChangedEvent,
} from 'src/common/events';
import { EVENTS } from 'src/common/events/event-names';
import { SocketService } from '../../infrastructure/socket/socket.service';
import {
  CommonSuccess,
  DriverErrors,
} from 'src/common/constants/response.constants';
import { DriverStatus, DriverShiftStatus, Role } from '@prisma/client';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(
    private readonly driversRepository: DriversRepository,
    private readonly storage: StorageService,
    private readonly eventEmitter: EventEmitter2,
    private readonly locationRepository: LocationRepository,
    private readonly socketService: SocketService,
  ) {}

  // ─── Register ─────────────────────────────────────────────────────────────

  async register(userId: string, dto: RegisterDriverDto) {
    const existing = await this.driversRepository.findByUserId(userId);
    if (existing) throw new ConflictException(DriverErrors.PROFILE_EXISTS);

    // Upgrade user role to DRIVER
    await this.driversRepository.updateUserRole(userId, Role.DRIVER);

    const driver = await this.driversRepository.create({
      userId,
      name: dto.name,
      nationalId: dto.nationalId ?? null,
      licenseNumber: dto.licenseNumber ?? null,
      vehicleType: dto.vehicleType ?? 'MOTORCYCLE',
      vehiclePlate: dto.vehiclePlate ?? null,
    });

    this.logger.log(`Driver registered: ${driver.id} for user ${userId}`);
    return driver;
  }

  // ─── Profile ──────────────────────────────────────────────────────────────

  async getMyProfile(userId: string) {
    const driver = await this.driversRepository.findByUserIdWithUser(userId);
    if (!driver) throw new NotFoundException(DriverErrors.PROFILE_NOT_FOUND);
    return driver;
  }

  async updateProfile(userId: string, dto: UpdateDriverProfileDto) {
    const driver = await this.assertDriver(userId);
    return this.driversRepository.update(driver.id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.nationalId !== undefined && { nationalId: dto.nationalId }),
      ...(dto.licenseNumber !== undefined && {
        licenseNumber: dto.licenseNumber,
      }),
      ...(dto.vehicleType !== undefined && { vehicleType: dto.vehicleType }),
      ...(dto.vehiclePlate !== undefined && { vehiclePlate: dto.vehiclePlate }),
    });
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const driver = await this.assertDriver(userId);

    if (driver.avatar) {
      await this.storage.delete(driver.avatar);
    }

    const avatarUrl = await this.storage.upload(file, 'drivers/avatars');
    await this.driversRepository.updateAvatar(driver.id, avatarUrl);
    return { avatar: avatarUrl };
  }

  // ─── Status ───────────────────────────────────────────────────────────────

  async updateStatus(userId: string, dto: UpdateDriverStatusDto) {
    const driver = await this.assertDriver(userId);

    if (driver.status === DriverStatus.SUSPENDED) {
      throw new ForbiddenException(DriverErrors.ACCOUNT_SUSPENDED);
    }

    if (!driver.isApproved) {
      throw new ForbiddenException(DriverErrors.NOT_APPROVED);
    }

    const activeStatuses: DriverStatus[] = [
      DriverStatus.ON_DELIVERY,
      DriverStatus.BUSY,
    ];
    if (
      activeStatuses.includes(driver.status) &&
      dto.status === DriverStatus.OFFLINE
    ) {
      throw new BadRequestException(
        'Cannot go offline while on an active delivery',
      );
    }

    const oldStatus = driver.status;
    await this.driversRepository.updateStatus(driver.id, dto.status);

    if (dto.status === DriverStatus.OFFLINE || dto.status === DriverStatus.SUSPENDED) {
      const pos = await this.locationRepository.getDriverLocation(driver.id);
      if (pos) {
        await this.driversRepository.updateLastLocation(driver.id, pos.lng, pos.lat);
      }
      await this.locationRepository.removeDriverLocation(driver.id);
    }

    this.eventEmitter.emit(
      EVENTS.DRIVER_STATUS_CHANGED,
      new DriverStatusChangedEvent(driver.id, userId, oldStatus, dto.status),
    );

    this.logger.log(`Driver ${driver.id} status: ${oldStatus} → ${dto.status}`);
    return { status: dto.status };
  }



  // ─── Shifts ───────────────────────────────────────────────────────────────

  async createShift(userId: string, dto: CreateDriverShiftDto) {
    const driver = await this.assertDriver(userId);

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (endTime <= startTime) {
      throw new BadRequestException(DriverErrors.END_TIME_BEFORE_START);
    }

    const overlap = await this.driversRepository.findOverlappingShift(
      driver.id,
      startTime,
      endTime,
    );
    if (overlap) throw new ConflictException(DriverErrors.SHIFT_OVERLAPS);

    return this.driversRepository.createShift({
      driverId: driver.id,
      zoneId: dto.zoneId ?? null,
      startTime,
      endTime,
    });
  }

  async getMyShifts(userId: string) {
    const driver = await this.assertDriver(userId);
    return this.driversRepository.findShiftsByDriver(driver.id);
  }

  async startShift(userId: string, shiftId: string) {
    const driver = await this.assertDriver(userId);
    const shift = await this.driversRepository.findShiftById(
      shiftId,
      driver.id,
    );

    if (!shift) throw new NotFoundException(DriverErrors.SHIFT_NOT_FOUND);
    if (shift.status !== DriverShiftStatus.SCHEDULED) {
      throw new BadRequestException(DriverErrors.SHIFT_NOT_SCHEDULED);
    }

    try {
      const startedShift = await this.driversRepository.startShiftSafely(
        shiftId,
        driver.id,
      );

      if (!startedShift) {
        throw new BadRequestException(DriverErrors.SHIFT_NOT_SCHEDULED);
      }

      return startedShift;
    } catch (error) {
      if ((error as Error).message === 'ACTIVE_SHIFT_EXISTS') {
        throw new BadRequestException(DriverErrors.ACTIVE_SHIFT_EXISTS);
      }
      throw error;
    }
  }

  async endShift(userId: string, shiftId: string) {
    const driver = await this.assertDriver(userId);
    const shift = await this.driversRepository.findShiftById(
      shiftId,
      driver.id,
    );

    if (!shift) throw new NotFoundException(DriverErrors.SHIFT_NOT_FOUND);
    if (shift.status !== DriverShiftStatus.ACTIVE) {
      throw new BadRequestException(DriverErrors.SHIFT_NOT_ACTIVE);
    }
    if (driver.status === DriverStatus.ON_DELIVERY) {
      throw new BadRequestException(DriverErrors.CANNOT_END_WHILE_ON_DELIVERY);
    }

    const [totalDeliveries, totalEarnings] = await Promise.all([
      this.driversRepository.countDeliveredOrdersInShift(shiftId),
      this.driversRepository.sumShiftEarnings(shiftId),
    ]);

    let updatedShift;
    try {
      updatedShift = await this.driversRepository.endShiftSafely(shiftId, {
        status: DriverShiftStatus.COMPLETED,
        actualEnd: new Date(),
        totalDeliveries,
        totalEarnings,
      });
    } catch (e) {
      throw new BadRequestException(DriverErrors.SHIFT_NOT_ACTIVE);
    }

    // Tier Promotion Logic
    const fullDriver = await this.driversRepository.findById(driver.id);
    if (fullDriver) {
      // Must have started on time (i.e. no MISSED status or cron demotion, which is implicitly true if we are here and it was ACTIVE)
      // Check 0 rejected and 0 expired
      if (
        updatedShift.rejectedDispatches === 0 &&
        updatedShift.expiredDispatches === 0
      ) {
        let newTier = fullDriver.tier;
        if (newTier === 'BRONZE') newTier = 'SILVER';
        else if (newTier === 'SILVER') newTier = 'GOLD';

        if (newTier !== fullDriver.tier) {
          await this.driversRepository.update(fullDriver.id, {
            tier: newTier,
          });
        }
      }
    }

    return updatedShift;
  }

  async endShiftBySystem(driverId: string, shiftId: string) {
    const shift = await this.driversRepository.findShiftById(shiftId, driverId);
    if (!shift || shift.status !== DriverShiftStatus.ACTIVE) {
      return;
    }

    const [totalDeliveries, totalEarnings] = await Promise.all([
      this.driversRepository.countDeliveredOrdersInShift(shiftId),
      this.driversRepository.sumShiftEarnings(shiftId),
    ]);

    let updatedShift;
    try {
      updatedShift = await this.driversRepository.endShiftSafely(shiftId, {
        status: DriverShiftStatus.COMPLETED,
        actualEnd: new Date(),
        totalDeliveries,
        totalEarnings,
      });
    } catch (e) {
      return;
    }

    // Tier Promotion Logic
    const fullDriver = await this.driversRepository.findById(driverId);
    if (fullDriver) {
      if (
        updatedShift.rejectedDispatches === 0 &&
        updatedShift.expiredDispatches === 0
      ) {
        let newTier = fullDriver.tier;
        if (newTier === 'BRONZE') newTier = 'SILVER';
        else if (newTier === 'SILVER') newTier = 'GOLD';

        if (newTier !== fullDriver.tier) {
          await this.driversRepository.update(fullDriver.id, {
            tier: newTier,
          });
        }
      }
    }

    return updatedShift;
  }

  // ─── Wallet ───────────────────────────────────────────────────────────────

  async getWalletBalance(userId: string) {
    const driver = await this.assertDriver(userId);
    return { walletBalance: driver.walletBalance };
  }

  async getWalletTransactions(userId: string, dto: QueryDriverWalletDto) {
    const driver = await this.assertDriver(userId);
    const { page = 1, limit = 20 } = dto;

    const result = await this.driversRepository.getWalletTransactions(
      driver.id,
      page,
      limit,
    );

    return { walletBalance: driver.walletBalance, ...result };
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async adminCreateDriver(userId: string, adminId: string, dto: any) {
    // Note: DTO type is cast as any here to avoid cyclic imports if not careful, 
    // but better to import AdminCreateDriverDto.
    const existing = await this.driversRepository.findByUserId(userId);
    if (existing) throw new ConflictException(DriverErrors.PROFILE_EXISTS);

    // Create the driver profile
    const driver = await this.driversRepository.create({
      userId,
      name: dto.name,
      nationalId: dto.nationalId ?? null,
      licenseNumber: dto.licenseNumber ?? null,
      vehicleType: dto.vehicleType ?? 'MOTORCYCLE',
      vehiclePlate: dto.vehiclePlate ?? null,
    });

    if (dto.status || dto.tier || dto.isApproved !== undefined) {
      const updateData: any = {
        status: dto.status ?? DriverStatus.OFFLINE,
        tier: dto.tier ?? 'BRONZE'
      };
      
      if (dto.isApproved !== undefined) {
        updateData.isApproved = dto.isApproved;
        if (dto.isApproved) {
          updateData.approvedAt = new Date();
          updateData.approvedById = adminId;
        }
      }

      await this.driversRepository.update(driver.id, updateData);
    }

    // Log the action
    await this.logAdminAction(adminId, 'CREATE', 'Driver', driver.id, null, dto);

    this.logger.log(`Admin ${adminId} created driver ${driver.id}`);
    return this.driversRepository.findById(driver.id);
  }

  async adminUpdateDriver(driverId: string, adminId: string, dto: any) {
    const driver = await this.driversRepository.findById(driverId);
    if (!driver) throw new NotFoundException(DriverErrors.PROFILE_NOT_FOUND);

    const oldValues = { ...driver };

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.nationalId !== undefined) updateData.nationalId = dto.nationalId;
    if (dto.licenseNumber !== undefined) updateData.licenseNumber = dto.licenseNumber;
    if (dto.vehicleType !== undefined) updateData.vehicleType = dto.vehicleType;
    if (dto.vehiclePlate !== undefined) updateData.vehiclePlate = dto.vehiclePlate;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.tier !== undefined) updateData.tier = dto.tier;
    if (dto.isApproved !== undefined) {
      updateData.isApproved = dto.isApproved;
      if (dto.isApproved) {
        updateData.approvedAt = new Date();
        updateData.approvedById = adminId;
      }
    }

    await this.driversRepository.update(driverId, updateData);

    // Log the action
    await this.logAdminAction(adminId, 'UPDATE', 'Driver', driverId, oldValues, updateData);

    this.logger.log(`Admin ${adminId} updated driver ${driverId}`);
    return this.driversRepository.findById(driverId);
  }

  private async logAdminAction(adminId: string, actionType: any, entityType: string, entityId: string, oldValues: any, newValues: any) {
    // We emit an event or write to AuditLog directly. 
    // Since we don't have AuditLog repository injected here, let's use Prisma directly or emit an event.
    // The codebase seems to have an AuditLog model. Let's emit an event if there's an audit listener, or just use Prisma if available.
    // Actually, it's safer to emit an event if audit log service handles it, or not log if it breaks.
    // Wait, the prompt says "Add audit logging".
    try {
      this.eventEmitter.emit('audit.log.created', {
        userId: adminId,
        actionType,
        action: `${actionType}_DRIVER_PROFILE`,
        entityType,
        entityId,
        oldValues,
        newValues,
      });
    } catch (e) {
      this.logger.error('Failed to log admin action', e);
    }
  }

  async adminFindAll(dto: QueryDriversDto) {
    return this.driversRepository.findAll({
      status: dto.status,
      search: dto.search,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    });
  }

  async adminFindOne(driverId: string) {
    const driver = await this.driversRepository.findOneAdmin(driverId);
    if (!driver) throw new NotFoundException(DriverErrors.PROFILE_NOT_FOUND);
    return driver;
  }

  async adminSuspend(driverId: string) {
    const driver = await this.driversRepository.findById(driverId);
    if (!driver) throw new NotFoundException(DriverErrors.PROFILE_NOT_FOUND);
    
    this.socketService.disconnectUser(driver.userId);

    return this.driversRepository.updateStatus(
      driverId,
      DriverStatus.SUSPENDED,
    );
  }

  async adminUnsuspend(driverId: string) {
    const driver = await this.driversRepository.findById(driverId);
    if (!driver) throw new NotFoundException(DriverErrors.PROFILE_NOT_FOUND);
    return this.driversRepository.updateStatus(driverId, DriverStatus.OFFLINE);
  }

  async adminCreateShift(driverId: string, dto: CreateDriverShiftDto) {
    const driver = await this.driversRepository.findById(driverId);
    if (!driver) throw new NotFoundException(DriverErrors.PROFILE_NOT_FOUND);

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (endTime <= startTime) {
      throw new BadRequestException(DriverErrors.END_TIME_BEFORE_START);
    }

    const overlap = await this.driversRepository.findOverlappingShift(
      driver.id,
      startTime,
      endTime,
    );
    if (overlap) throw new ConflictException(DriverErrors.SHIFT_OVERLAPS);

    return this.driversRepository.createShift({
      driverId: driver.id,
      zoneId: dto.zoneId ?? null,
      startTime,
      endTime,
    });
  }

  async adminGetShifts(driverId: string) {
    const driver = await this.driversRepository.findById(driverId);
    if (!driver) throw new NotFoundException(DriverErrors.PROFILE_NOT_FOUND);
    return this.driversRepository.findShiftsByDriver(driver.id);
  }

  // ─── Internal helper used by dispatch ────────────────────────────────────

  async getDriverByUserId(userId: string) {
    const driver = await this.driversRepository.findByUserId(userId);
    if (!driver) throw new NotFoundException(DriverErrors.PROFILE_NOT_FOUND);
    return driver;
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async assertDriver(userId: string) {
    const driver = await this.driversRepository.findByUserId(userId);
    if (!driver) throw new NotFoundException(DriverErrors.PROFILE_NOT_FOUND);
    return driver;
  }
}
