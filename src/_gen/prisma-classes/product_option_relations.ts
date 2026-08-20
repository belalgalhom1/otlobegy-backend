import { CartItemOption } from './cart_item_option';
import { OrderItemOption } from './order_item_option';
import { ProductOptionGroup } from './product_option_group';
import { ApiProperty } from '@nestjs/swagger';

export class ProductOptionRelations {
  @ApiProperty({ isArray: true, type: () => CartItemOption })
  cartItemOptions: CartItemOption[];

  @ApiProperty({ isArray: true, type: () => OrderItemOption })
  orderItemOptions: OrderItemOption[];

  @ApiProperty({ type: () => ProductOptionGroup })
  group: ProductOptionGroup;
}
