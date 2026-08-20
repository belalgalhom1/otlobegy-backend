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
  UploadedFile,
} from '@nestjs/common';
import { ApiFileUpload } from 'src/common/decorators/api-file-upload.decorator';
import { DriversService } from './drivers.service';
import { AuthService } from '../auth/auth.service';
import {
  RegisterDriverDto,
  UpdateDriverProfileDto,
  UpdateDriverStatusDto,
  CreateDriverShiftDto,
  QueryDriversDto,
  QueryDriverWalletDto,
  AdminCreateDriverDto,
  AdminUpdateDriverDto,
} from './dto/driver.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Permission, Role } from '@prisma/client';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';
import { Driver } from '../../_gen/prisma-classes/driver';
import { DriverShift } from '../../_gen/prisma-classes/driver_shift';
import { DriverWalletTransaction } from '../../_gen/prisma-classes/driver_wallet_transaction';

import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Drivers')
@ApiBearerAuth()
@Controller('drivers')
export class DriversController {
  constructor(
    private readonly driversService: DriversService,
    private readonly authService: AuthService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // SELF-SERVICE  — any authenticated user can register; then DRIVER only
  // ═══════════════════════════════════════════════════════════════════════════

  @ApiStandardResponse(Driver)
  @Post('register')
  @ApiOperation({
    summary: 'Register as a driver (creates driver profile, upgrades role)',
  })
  register(@CurrentUser('sub') userId: string, @Body() dto: RegisterDriverDto) {
    return this.driversService.register(userId, dto);
  }

  @ApiStandardResponse(Driver)
  @Get('me')
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'Get my driver profile' })
  getMyProfile(@CurrentUser('sub') userId: string) {
    return this.driversService.getMyProfile(userId);
  }

  @ApiStandardResponse(Driver)
  @Patch('me')
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'Update my driver profile' })
  updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateDriverProfileDto,
  ) {
    return this.driversService.updateProfile(userId, dto);
  }

  @ApiStandardResponse()
  @Post('me/avatar')
  @Roles(Role.DRIVER)
  @ApiFileUpload({ type: 'IMAGE', required: true })
  @ApiOperation({ summary: 'Upload driver avatar' })
  uploadAvatar(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.driversService.uploadAvatar(userId, file);
  }

  @ApiStandardResponse(Driver)
  @Patch('me/status')
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update driver status (ONLINE / OFFLINE / ON_BREAK)',
  })
  updateStatus(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateDriverStatusDto,
  ) {
    return this.driversService.updateStatus(userId, dto);
  }



  // ─── Shifts ───────────────────────────────────────────────────────────────

  @ApiStandardResponse(DriverShift)
  @Post('me/shifts')
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'Create a shift' })
  createShift(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateDriverShiftDto,
  ) {
    return this.driversService.createShift(userId, dto);
  }

  @ApiStandardResponse(DriverShift)
  @Get('me/shifts')
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'Get my shifts' })
  getMyShifts(@CurrentUser('sub') userId: string) {
    return this.driversService.getMyShifts(userId);
  }

  @ApiStandardResponse(DriverShift)
  @Post('me/shifts/:shiftId/start')
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a shift' })
  startShift(
    @CurrentUser('sub') userId: string,
    @Param('shiftId') shiftId: string,
  ) {
    return this.driversService.startShift(userId, shiftId);
  }

  @ApiStandardResponse(DriverShift)
  @Post('me/shifts/:shiftId/end')
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End a shift' })
  endShift(
    @CurrentUser('sub') userId: string,
    @Param('shiftId') shiftId: string,
  ) {
    return this.driversService.endShift(userId, shiftId);
  }

  // ─── Wallet ───────────────────────────────────────────────────────────────

  @ApiStandardResponse()
  @Get('me/wallet')
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'Get wallet balance' })
  getWalletBalance(@CurrentUser('sub') userId: string) {
    return this.driversService.getWalletBalance(userId);
  }

  @ApiStandardResponse(DriverWalletTransaction)
  @Get('me/wallet/transactions')
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'Get wallet transaction history' })
  getWalletTransactions(
    @CurrentUser('sub') userId: string,
    @Query() dto: QueryDriverWalletDto,
  ) {
    return this.driversService.getWalletTransactions(userId, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN
  // ═══════════════════════════════════════════════════════════════════════════

  @ApiStandardResponse(Driver)
  @Post('admin')
  @RequirePermissions(Permission.MANAGE_DRIVERS)
  @ApiOperation({ summary: '[Admin] Create a new driver directly' })
  async adminCreate(
    @CurrentUser() actor: any,
    @Body() dto: AdminCreateDriverDto,
  ) {
    // Create user with DRIVER role
    const { user } = await this.authService.register(
      {
        email: dto.email,
        phone: dto.phone,
        password: dto.password,
        name: dto.name,
        role: Role.DRIVER,
      },
      true, // isAdminCreated
    );

    // Create driver profile
    return this.driversService.adminCreateDriver(user.id, actor.sub, dto);
  }

  @ApiStandardResponse(Driver)
  @Patch(':driverId/admin')
  @RequirePermissions(Permission.MANAGE_DRIVERS)
  @ApiOperation({ summary: '[Admin] Update driver profile and sensitive fields' })
  async adminUpdate(
    @CurrentUser() actor: any,
    @Param('driverId') driverId: string,
    @Body() dto: AdminUpdateDriverDto,
  ) {
    return this.driversService.adminUpdateDriver(driverId, actor.sub, dto);
  }

  @ApiStandardResponse(Driver)
  @Get()
  @RequirePermissions(Permission.MANAGE_DRIVERS)
  @ApiOperation({ summary: '[Admin] List all drivers' })
  adminFindAll(@Query() dto: QueryDriversDto) {
    return this.driversService.adminFindAll(dto);
  }

  @ApiStandardResponse(Driver)
  @Get(':driverId')
  @RequirePermissions(Permission.MANAGE_DRIVERS)
  @ApiOperation({ summary: '[Admin] Get a driver by ID' })
  adminFindOne(@Param('driverId') driverId: string) {
    return this.driversService.adminFindOne(driverId);
  }

  @ApiStandardResponse(Driver)
  @Post(':driverId/suspend')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.MANAGE_DRIVERS)
  @ApiOperation({ summary: '[Admin] Suspend a driver' })
  adminSuspend(@Param('driverId') driverId: string) {
    return this.driversService.adminSuspend(driverId);
  }

  @ApiStandardResponse(Driver)
  @Post(':driverId/unsuspend')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.MANAGE_DRIVERS)
  @ApiOperation({ summary: '[Admin] Unsuspend a driver' })
  adminUnsuspend(@Param('driverId') driverId: string) {
    return this.driversService.adminUnsuspend(driverId);
  }

  @ApiStandardResponse(DriverShift)
  @Post(':driverId/shifts')
  @RequirePermissions(Permission.MANAGE_DRIVERS)
  @ApiOperation({ summary: '[Admin] Create a shift for a driver' })
  adminCreateShift(
    @Param('driverId') driverId: string,
    @Body() dto: CreateDriverShiftDto,
  ) {
    return this.driversService.adminCreateShift(driverId, dto);
  }

  @ApiStandardResponse(DriverShift)
  @Get(':driverId/shifts')
  @RequirePermissions(Permission.MANAGE_DRIVERS)
  @ApiOperation({ summary: '[Admin] Get shifts for a driver' })
  adminGetShifts(@Param('driverId') driverId: string) {
    return this.driversService.adminGetShifts(driverId);
  }
}
