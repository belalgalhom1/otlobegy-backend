import { Vendor } from './vendor';
import { Zone } from './zone';
import { VendorMember } from './vendor_member';
import { Order } from './order';
import { ApiProperty } from '@nestjs/swagger';

export class VendorBranchRelations {
  @ApiProperty({ type: () => Vendor })
  vendor: Vendor;

  @ApiProperty({ type: () => Zone })
  zone: Zone;

  @ApiProperty({ isArray: true, type: () => VendorMember })
  vendorMembers: VendorMember[];

  @ApiProperty({ isArray: true, type: () => Order })
  orders: Order[];
}
