import { StatisticPeriod } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class AppStatistic {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ enum: StatisticPeriod, enumName: 'StatisticPeriod' })
  period: StatisticPeriod;

  @ApiProperty({ type: Date })
  startDate: Date;

  @ApiProperty({ type: Date })
  endDate: Date;

  @ApiProperty({ type: Number })
  totalOrders: number;

  @ApiProperty({ type: Number })
  totalAdminRevenue: number;

  @ApiProperty({ type: Number })
  totalDeliveryFees: number;

  @ApiProperty({ type: Number })
  activeCustomers: number;

  @ApiProperty({ type: Number })
  activeDrivers: number;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
