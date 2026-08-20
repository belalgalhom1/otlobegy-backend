import { CoinTransactionType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerCoinTransaction {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  customerId: string;

  @ApiPropertyOptional({ type: String })
  orderId?: string;

  @ApiProperty({ enum: CoinTransactionType, enumName: 'CoinTransactionType' })
  type: CoinTransactionType;

  @ApiProperty({ type: Number })
  amount: number;

  @ApiProperty({ type: Number })
  balanceAfter: number;

  @ApiPropertyOptional({ type: String })
  description?: string;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
