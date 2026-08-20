import { DriverWalletTransaction } from './driver_wallet_transaction';
import { OrderDispatch } from './order_dispatch';
import { OrderItem } from './order_item';
import { OrderStatusEvent } from './order_status_event';
import { Customer } from './customer';
import { Driver } from './driver';
import { DriverShift } from './driver_shift';
import { Vendor } from './vendor';
import { VendorBranch } from './vendor_branch';
import { Zone } from './zone';
import { SupportTicket } from './support_ticket';
import { VendorWalletTransaction } from './vendor_wallet_transaction';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderRelations {
  @ApiProperty({ isArray: true, type: () => DriverWalletTransaction })
  driverTransactions: DriverWalletTransaction[];

  @ApiProperty({ isArray: true, type: () => OrderDispatch })
  dispatches: OrderDispatch[];

  @ApiProperty({ isArray: true, type: () => OrderItem })
  items: OrderItem[];

  @ApiProperty({ isArray: true, type: () => OrderStatusEvent })
  statusEvents: OrderStatusEvent[];

  @ApiProperty({ type: () => Customer })
  customer: Customer;

  @ApiPropertyOptional({ type: () => Driver })
  driver?: Driver;

  @ApiPropertyOptional({ type: () => DriverShift })
  driverShift?: DriverShift;

  @ApiPropertyOptional({ type: () => Vendor })
  vendor?: Vendor;

  @ApiPropertyOptional({ type: () => VendorBranch })
  vendorBranch?: VendorBranch;

  @ApiPropertyOptional({ type: () => Zone })
  zone?: Zone;

  @ApiProperty({ isArray: true, type: () => SupportTicket })
  supportTickets: SupportTicket[];

  @ApiProperty({ isArray: true, type: () => VendorWalletTransaction })
  vendorTransactions: VendorWalletTransaction[];
}
