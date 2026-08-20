import { Driver } from './driver';
import { ShiftPool } from './shift_pool';
import { Zone } from './zone';
import { DriverWalletTransaction } from './driver_wallet_transaction';
import { OrderDispatch } from './order_dispatch';
import { Order } from './order';
import { ShiftSwapRequest } from './shift_swap_request';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DriverShiftRelations {
  @ApiProperty({ type: () => Driver })
  driver: Driver;

  @ApiPropertyOptional({ type: () => ShiftPool })
  shiftPool?: ShiftPool;

  @ApiPropertyOptional({ type: () => Zone })
  zone?: Zone;

  @ApiProperty({ isArray: true, type: () => DriverWalletTransaction })
  walletTransactions: DriverWalletTransaction[];

  @ApiProperty({ isArray: true, type: () => OrderDispatch })
  dispatches: OrderDispatch[];

  @ApiProperty({ isArray: true, type: () => Order })
  orders: Order[];

  @ApiProperty({ isArray: true, type: () => ShiftSwapRequest })
  swapRequests: ShiftSwapRequest[];
}
