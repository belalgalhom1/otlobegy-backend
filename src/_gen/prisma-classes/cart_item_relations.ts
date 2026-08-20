import { CartItemOption } from './cart_item_option';
import { Cart } from './cart';
import { Product } from './product';
import { ProductVariant } from './product_variant';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartItemRelations {
  @ApiProperty({ isArray: true, type: () => CartItemOption })
  selectedOptions: CartItemOption[];

  @ApiProperty({ type: () => Cart })
  cart: Cart;

  @ApiPropertyOptional({ type: () => Product })
  product?: Product;

  @ApiPropertyOptional({ type: () => ProductVariant })
  variant?: ProductVariant;
}
