import { WalletType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MobileWallet {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  number: string;

  @ApiProperty({ enum: WalletType, enumName: 'WalletType' })
  type: WalletType;

  @ApiProperty({ type: Boolean })
  isActive: boolean = true;

  @ApiProperty({ type: Boolean })
  isPlatform: boolean;

  @ApiPropertyOptional({ type: String })
  driverId?: string;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
