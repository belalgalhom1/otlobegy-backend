import { Vendor } from './vendor';
import { ApiProperty } from '@nestjs/swagger';

export class VendorVerticalRelations {
  @ApiProperty({ isArray: true, type: () => Vendor })
  vendors: Vendor[];
}
