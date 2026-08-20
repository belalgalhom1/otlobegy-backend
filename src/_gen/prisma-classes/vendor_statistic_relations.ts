import { Vendor } from './vendor';
import { ApiProperty } from '@nestjs/swagger';

export class VendorStatisticRelations {
  @ApiProperty({ type: () => Vendor })
  vendor: Vendor;
}
