import { Order } from './order';
import { Vendor } from './vendor';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class VendorWalletTransactionRelations {
  @ApiPropertyOptional({ type: () => Order })
  order?: Order;

  @ApiProperty({ type: () => Vendor })
  vendor: Vendor;
}
