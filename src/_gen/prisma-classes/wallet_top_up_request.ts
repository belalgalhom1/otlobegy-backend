import { TopUpStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WalletTopUpRequest {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  driverId: string;

  @ApiProperty({ type: String })
  platformWalletId: string;

  @ApiProperty({ type: Number })
  amount: number;

  @ApiProperty({ type: String })
  receiptUrl: string;

  @ApiProperty({ enum: TopUpStatus, enumName: 'TopUpStatus' })
  status: TopUpStatus = TopUpStatus.PENDING;

  @ApiPropertyOptional({ type: String })
  approvedById?: string;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
