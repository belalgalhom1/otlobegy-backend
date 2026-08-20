import { User } from './user';
import { Vendor } from './vendor';
import { VendorBranch } from './vendor_branch';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VendorMemberRelations {
  @ApiProperty({ type: () => User })
  user: User;

  @ApiProperty({ type: () => Vendor })
  vendor: Vendor;

  @ApiPropertyOptional({ type: () => VendorBranch })
  branch?: VendorBranch;
}
