import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShiftPool {
  @ApiProperty({ type: String })
  id: string;

  @ApiPropertyOptional({ type: String })
  zoneId?: string;

  @ApiProperty({ type: Date })
  shiftDate: Date;

  @ApiProperty({ type: Date })
  startTime: Date;

  @ApiProperty({ type: Date })
  endTime: Date;

  @ApiProperty({ type: Number })
  maxDrivers: number;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
