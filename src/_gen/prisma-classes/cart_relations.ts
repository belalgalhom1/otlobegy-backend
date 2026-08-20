import { CartItem } from './cart_item';
import { Customer } from './customer';
import { Vendor } from './vendor';
import { ApiProperty } from '@nestjs/swagger';

export class CartRelations {
  @ApiProperty({ isArray: true, type: () => CartItem })
  items: CartItem[];

  @ApiProperty({ type: () => Customer })
  customer: Customer;

  @ApiProperty({ type: () => Vendor })
  vendor: Vendor;
}
