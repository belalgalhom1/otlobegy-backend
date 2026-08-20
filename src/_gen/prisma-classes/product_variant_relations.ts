import { CartItem } from './cart_item';
import { OrderItem } from './order_item';
import { ProductOptionGroup } from './product_option_group';
import { Product } from './product';
import { ApiProperty } from '@nestjs/swagger';

export class ProductVariantRelations {
  @ApiProperty({ isArray: true, type: () => CartItem })
  cartItems: CartItem[];

  @ApiProperty({ isArray: true, type: () => OrderItem })
  orderItems: OrderItem[];

  @ApiProperty({ isArray: true, type: () => ProductOptionGroup })
  optionGroups: ProductOptionGroup[];

  @ApiProperty({ type: () => Product })
  product: Product;
}
