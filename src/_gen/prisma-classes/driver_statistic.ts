import { StatisticPeriod } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DriverStatistic {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  driverId: string;

  @ApiProperty({ enum: StatisticPeriod, enumName: 'StatisticPeriod' })
  period: StatisticPeriod;

  @ApiProperty({ type: Date })
  startDate: Date;

  @ApiProperty({ type: Date })
  endDate: Date;

  @ApiProperty({ type: Number })
  totalOrders: number;

  @ApiProperty({ type: Number })
  totalEarnings: number;

  @ApiProperty({ type: Number })
  completedOrders: number;

  @ApiProperty({ type: Number })
  cancelledOrders: number;

  @ApiPropertyOptional({ type: Number })
  onlineHours?: number;

  @ApiProperty({ type: Number })
  totalDispatchesReceived: number;

  @ApiProperty({ type: Number })
  dispatchesAccepted: number;

  @ApiProperty({ type: Number })
  dispatchesRejected: number;

  @ApiProperty({ type: Number })
  dispatchesExpired: number;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
