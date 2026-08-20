import { Customer } from './customer';
import { Product } from './product';
import { ApiProperty } from '@nestjs/swagger';

export class FavoriteProductRelations {
  @ApiProperty({ type: () => Customer })
  customer: Customer;

  @ApiProperty({ type: () => Product })
  product: Product;
}
