import { WalletTransactionType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DriverWalletTransaction {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  driverId: string;

  @ApiPropertyOptional({ type: String })
  orderId?: string;

  @ApiPropertyOptional({ type: String })
  driverShiftId?: string;

  @ApiProperty({
    enum: WalletTransactionType,
    enumName: 'WalletTransactionType',
  })
  type: WalletTransactionType;

  @ApiProperty({ type: Number })
  amount: number;

  @ApiProperty({ type: Number })
  balanceAfter: number;

  @ApiPropertyOptional({ type: String })
  description?: string;

  @ApiPropertyOptional({ type: String })
  referenceId?: string;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
