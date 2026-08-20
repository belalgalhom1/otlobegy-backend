import { Customer } from './customer';
import { Vendor } from './vendor';
import { ApiProperty } from '@nestjs/swagger';

export class FavoriteVendorRelations {
  @ApiProperty({ type: () => Customer })
  customer: Customer;

  @ApiProperty({ type: () => Vendor })
  vendor: Vendor;
}
