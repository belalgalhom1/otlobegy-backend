import { CartItem } from './cart_item';
import { ProductOption } from './product_option';
import { ApiProperty } from '@nestjs/swagger';

export class CartItemOptionRelations {
  @ApiProperty({ type: () => CartItem })
  cartItem: CartItem;

  @ApiProperty({ type: () => ProductOption })
  option: ProductOption;
}
