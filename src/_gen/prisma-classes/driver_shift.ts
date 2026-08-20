import { DriverShiftStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DriverShift {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  driverId: string;

  @ApiPropertyOptional({ type: String })
  shiftPoolId?: string;

  @ApiPropertyOptional({ type: String })
  zoneId?: string;

  @ApiProperty({ type: Date })
  shiftDate: Date;

  @ApiProperty({ type: Date })
  startTime: Date;

  @ApiProperty({ type: Date })
  endTime: Date;

  @ApiPropertyOptional({ type: Date })
  actualStart?: Date;

  @ApiPropertyOptional({ type: Date })
  actualEnd?: Date;

  @ApiProperty({ enum: DriverShiftStatus, enumName: 'DriverShiftStatus' })
  status: DriverShiftStatus = DriverShiftStatus.SCHEDULED;

  @ApiPropertyOptional({ type: Number })
  breakMinutes?: number;

  @ApiPropertyOptional({ type: Number })
  totalEarnings?: number;

  @ApiPropertyOptional({ type: Number })
  totalDeliveries?: number;

  @ApiProperty({ type: Number })
  expiredDispatches: number;

  @ApiProperty({ type: Number })
  rejectedDispatches: number;

  @ApiProperty({ type: Boolean })
  warningSent: boolean;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
