import { Driver } from './driver';
import { MobileWallet } from './mobile_wallet';
import { User } from './user';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WalletTopUpRequestRelations {
  @ApiProperty({ type: () => Driver })
  driver: Driver;

  @ApiProperty({ type: () => MobileWallet })
  platformWallet: MobileWallet;

  @ApiPropertyOptional({ type: () => User })
  approvedBy?: User;
}
