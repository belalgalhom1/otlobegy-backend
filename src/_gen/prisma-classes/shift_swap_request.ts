import { SwapRequestStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class ShiftSwapRequest {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  driverShiftId: string;

  @ApiProperty({ type: String })
  offeredByDriverId: string;

  @ApiProperty({ enum: SwapRequestStatus, enumName: 'SwapRequestStatus' })
  status: SwapRequestStatus = SwapRequestStatus.PENDING;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
