import { Driver } from './driver';
import { WalletTopUpRequest } from './wallet_top_up_request';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class MobileWalletRelations {
  @ApiPropertyOptional({ type: () => Driver })
  driver?: Driver;

  @ApiProperty({ isArray: true, type: () => WalletTopUpRequest })
  topUps: WalletTopUpRequest[];
}
