import { Vendor } from './vendor';
import { Product } from './product';
import { ApiProperty } from '@nestjs/swagger';

export class MenuCategoryRelations {
  @ApiProperty({ type: () => Vendor })
  vendor: Vendor;

  @ApiProperty({ isArray: true, type: () => Product })
  products: Product[];
}
