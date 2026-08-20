import { Controller, Get, Param, Query } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtAccessPayload } from 'src/common/interfaces/jwt-payload.interface';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { VendorMember } from 'src/common/decorators/vendor-member.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Permission, Role, StatisticPeriod } from '@prisma/client';
import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';

import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

class StatsQueryDto {
  @IsEnum(StatisticPeriod)
  @IsOptional()
  period?: StatisticPeriod = StatisticPeriod.DAILY;

  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 30;
}

@ApiTags('Statistics')
@ApiBearerAuth()
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  // ─── Vendor stats (vendor member or admin) ────────────────────────────────

  @ApiStandardResponse()
  @Get('vendors/:vendorId')
  @VendorMember({ vendorIdParam: 'vendorId' })
  @ApiOperation({ summary: 'Get vendor statistics (member or admin)' })
  @ApiQuery({ name: 'period', enum: StatisticPeriod, required: false })
  getVendorStats(
    @Param('vendorId') vendorId: string,
    @Query() dto: StatsQueryDto,
  ) {
    return this.statisticsService.getVendorStats(
      vendorId,
      dto.period ?? StatisticPeriod.DAILY,
      dto.limit,
    );
  }

  @ApiStandardResponse()
  @Get('vendors/:vendorId/most-ordered-product')
  @VendorMember({ vendorIdParam: 'vendorId' })
  @ApiOperation({ summary: 'Get the most ordered product for a vendor' })
  getMostOrderedProduct(@Param('vendorId') vendorId: string) {
    return this.statisticsService.getMostOrderedProduct(vendorId);
  }

  // ─── Driver stats (self) ──────────────────────────────────────────────────

  @ApiStandardResponse()
  @Get('driver/me')
  @Roles(Role.DRIVER)
  @ApiOperation({ summary: 'Get my driver statistics' })
  getMyDriverStats(
    @CurrentUser() actor: JwtAccessPayload,
    @Query() dto: StatsQueryDto,
  ) {
    return this.statisticsService.getMyDriverStats(
      actor.sub,
      dto.period ?? StatisticPeriod.DAILY,
      dto.limit,
    );
  }

  // ─── Admin: platform-wide stats ───────────────────────────────────────────

  @ApiStandardResponse()
  @Get('app')
  @RequirePermissions(Permission.VIEW_STATISTICS)
  @ApiOperation({ summary: '[Admin] Get platform-wide statistics' })
  getAppStats(@Query() dto: StatsQueryDto) {
    return this.statisticsService.getAppStats(
      dto.period ?? StatisticPeriod.DAILY,
      dto.limit,
    );
  }

  // ─── Admin: stats for a specific driver ───────────────────────────────────

  @ApiStandardResponse()
  @Get('drivers/:driverId')
  @RequirePermissions(Permission.MANAGE_DRIVERS)
  @ApiOperation({ summary: '[Admin] Get statistics for a specific driver' })
  getDriverStats(
    @Param('driverId') driverId: string,
    @Query() dto: StatsQueryDto,
  ) {
    return this.statisticsService.getDriverStats(
      driverId,
      dto.period ?? StatisticPeriod.DAILY,
      dto.limit,
    );
  }

  // ─── Analytics Leaderboards ───────────────────────────────────────────────

  @ApiStandardResponse()
  @Get('analytics/drivers')
  @RequirePermissions(Permission.VIEW_STATISTICS)
  @ApiOperation({ summary: '[Admin] Get top drivers leaderboard' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopDrivers(@Query('limit') limit?: number) {
    return this.statisticsService.getTopDrivers(limit ? Number(limit) : 20);
  }

  @ApiStandardResponse()
  @Get('analytics/customers')
  @RequirePermissions(Permission.VIEW_STATISTICS)
  @ApiOperation({ summary: '[Admin] Get top customers leaderboard' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopCustomers(@Query('limit') limit?: number) {
    return this.statisticsService.getTopCustomers(limit ? Number(limit) : 20);
  }

  @ApiStandardResponse()
  @Get('analytics/vendors')
  @RequirePermissions(Permission.VIEW_STATISTICS)
  @ApiOperation({ summary: '[Admin] Get top vendors leaderboard' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopVendors(@Query('limit') limit?: number) {
    return this.statisticsService.getTopVendors(limit ? Number(limit) : 20);
  }

  @ApiStandardResponse()
  @Get('analytics/products')
  @RequirePermissions(Permission.VIEW_STATISTICS)
  @ApiOperation({ summary: '[Admin] Get top products leaderboard' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopProducts(@Query('limit') limit?: number) {
    return this.statisticsService.getTopProducts(limit ? Number(limit) : 20);
  }
}
