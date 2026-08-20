import { Vendor } from './vendor';
import { Product } from './product';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PromotionRelations {
  @ApiPropertyOptional({ type: () => Vendor })
  vendor?: Vendor;

  @ApiPropertyOptional({ type: () => Product })
  product?: Product;
}
