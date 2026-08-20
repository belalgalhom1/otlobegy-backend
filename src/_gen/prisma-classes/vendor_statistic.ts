import { StatisticPeriod } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VendorStatistic {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  vendorId: string;

  @ApiProperty({ enum: StatisticPeriod, enumName: 'StatisticPeriod' })
  period: StatisticPeriod;

  @ApiProperty({ type: Date })
  startDate: Date;

  @ApiProperty({ type: Date })
  endDate: Date;

  @ApiProperty({ type: Number })
  totalOrders: number;

  @ApiProperty({ type: Number })
  totalRevenue: number;

  @ApiProperty({ type: Number })
  totalCommission: number;

  @ApiProperty({ type: Number })
  totalTax: number;

  @ApiProperty({ type: Number })
  completedOrders: number;

  @ApiProperty({ type: Number })
  cancelledOrders: number;

  @ApiPropertyOptional({ type: Number })
  avgPrepTimeMins?: number;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
