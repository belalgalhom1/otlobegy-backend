import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DriverShiftsService } from './driver-shifts.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { Role, Permission } from '@prisma/client';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';

import {
  GenerateShiftPoolsDto,
  BookWeeklyShiftsDto,
  BookOvertimeShiftDto,
  QueryShiftPoolsDto,
  AdminAssignShiftDto,
} from './dto/driver-shifts.dto';

@ApiTags('Driver Shifts')
@ApiBearerAuth()
@Controller('driver-shifts')
export class DriverShiftsController {
  constructor(private readonly shiftsService: DriverShiftsService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  @ApiStandardResponse()
  @Post('admin/pools')
  @RequirePermissions(Permission.MANAGE_DRIVERS)
  @ApiOperation({ summary: '[Admin] Generate shift pools for a date range' })
  generateShiftPools(@Body() dto: GenerateShiftPoolsDto) {
    return this.shiftsService.generateShiftPools(dto);
  }

  @ApiStandardResponse()
  @Get('admin/pools')
  @RequirePermissions(Permission.MANAGE_DRIVERS)
  @ApiOperation({ summary: '[Admin] Get shift pools' })
  getShiftPools(@Query() dto: QueryShiftPoolsDto) {
    return this.shiftsService.getShiftPools(dto);
  }

  @ApiStandardResponse()
  @Delete('admin/pools/:poolId')
  @RequirePermissions(Permission.MANAGE_DRIVERS)
  @ApiOperation({ summary: '[Admin] Terminate/Delete a shift pool' })
  terminateShiftPool(@Param('poolId') poolId: string) {
    return this.shiftsService.terminateShiftPool(poolId);
  }

  @ApiStandardResponse()
  @Post('admin/assign')
  @RequirePermissions(Permission.MANAGE_DRIVERS)
  @ApiOperation({ summary: '[Admin] Force-assign a driver to a shift pool' })
  adminAssignShift(@Body() dto: AdminAssignShiftDto) {
    return this.shiftsService.adminAssignShift(dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DRIVER APP ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  @ApiStandardResponse()
  @Get('available')
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'Get available shift pools for booking' })
  getAvailablePools(@Query('zoneId') zoneId?: string) {
    return this.shiftsService.getAvailablePools(zoneId);
  }

  @ApiStandardResponse()
  @Post('book-week')
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Book 6 shifts for the week' })
  bookWeeklyShifts(
    @CurrentUser('sub') userId: string,
    @Body() dto: BookWeeklyShiftsDto,
  ) {
    return this.shiftsService.bookWeeklyShifts(userId, dto);
  }

  @ApiStandardResponse()
  @Post('book-overtime')
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Book a single extra shift' })
  bookOvertimeShift(
    @CurrentUser('sub') userId: string,
    @Body() dto: BookOvertimeShiftDto,
  ) {
    return this.shiftsService.bookOvertimeShift(userId, dto);
  }

  @ApiStandardResponse()
  @Post(':shiftId/swap')
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Offer a shift to the swap board' })
  offerSwap(
    @CurrentUser('sub') userId: string,
    @Param('shiftId') shiftId: string,
  ) {
    return this.shiftsService.offerSwap(userId, shiftId);
  }

  @ApiStandardResponse()
  @Get('swap-board')
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'View available swaps from other drivers' })
  getSwapBoard(@CurrentUser('sub') userId: string) {
    return this.shiftsService.getSwapBoard(userId);
  }

  @ApiStandardResponse()
  @Post('swap/:swapId/accept')
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Claim someone else's shift from the swap board" })
  acceptSwap(
    @CurrentUser('sub') userId: string,
    @Param('swapId') swapId: string,
  ) {
    return this.shiftsService.acceptSwap(userId, swapId);
  }
}
