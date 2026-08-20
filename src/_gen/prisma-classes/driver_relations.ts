import { DriverShift } from './driver_shift';
import { DriverStatistic } from './driver_statistic';
import { DriverWalletTransaction } from './driver_wallet_transaction';
import { MobileWallet } from './mobile_wallet';
import { WalletTopUpRequest } from './wallet_top_up_request';
import { User } from './user';
import { OrderDispatch } from './order_dispatch';
import { Order } from './order';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DriverRelations {
  @ApiProperty({ isArray: true, type: () => DriverShift })
  shifts: DriverShift[];

  @ApiProperty({ isArray: true, type: () => DriverStatistic })
  statistics: DriverStatistic[];

  @ApiProperty({ isArray: true, type: () => DriverWalletTransaction })
  walletTransactions: DriverWalletTransaction[];

  @ApiProperty({ isArray: true, type: () => MobileWallet })
  mobileWallets: MobileWallet[];

  @ApiProperty({ isArray: true, type: () => WalletTopUpRequest })
  topUps: WalletTopUpRequest[];

  @ApiProperty({ type: () => User })
  user: User;

  @ApiPropertyOptional({ type: () => User })
  approvedBy?: User;

  @ApiProperty({ isArray: true, type: () => OrderDispatch })
  dispatches: OrderDispatch[];

  @ApiProperty({ isArray: true, type: () => Order })
  orders: Order[];
}
