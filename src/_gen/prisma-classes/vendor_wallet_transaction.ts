import { VendorTransactionType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VendorWalletTransaction {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  vendorId: string;

  @ApiPropertyOptional({ type: String })
  orderId?: string;

  @ApiProperty({
    enum: VendorTransactionType,
    enumName: 'VendorTransactionType',
  })
  type: VendorTransactionType;

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
