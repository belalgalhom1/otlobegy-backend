import { Vendor } from './vendor';
import { Product } from './product';
import { ApiProperty } from '@nestjs/swagger';

export class OfferRelations {
  @ApiProperty({ type: () => Vendor })
  vendor: Vendor;

  @ApiProperty({ type: () => Product })
  product: Product;
}
