import { OrderType, DispatchStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderDispatch {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  orderId: string;

  @ApiProperty({ type: String })
  driverId: string;

  @ApiPropertyOptional({ type: String })
  driverShiftId?: string;

  @ApiProperty({ enum: OrderType, enumName: 'OrderType' })
  type: OrderType = OrderType.STANDARD;

  @ApiProperty({ enum: DispatchStatus, enumName: 'DispatchStatus' })
  status: DispatchStatus = DispatchStatus.PENDING;

  @ApiPropertyOptional({ type: Number })
  distanceKm?: number;

  @ApiPropertyOptional({ type: Number })
  estimatedEarnings?: number;

  @ApiProperty({ type: Date })
  expiresAt: Date;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
