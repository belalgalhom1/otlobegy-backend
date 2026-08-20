import { CartItem } from './cart_item';
import { FavoriteProduct } from './favorite_product';
import { OrderItem } from './order_item';
import { ProductOptionGroup } from './product_option_group';
import { ProductVariant } from './product_variant';
import { Promotion } from './promotion';
import { Offer } from './offer';
import { MenuCategory } from './menu_category';
import { Vendor } from './vendor';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductRelations {
  @ApiProperty({ isArray: true, type: () => CartItem })
  cartItems: CartItem[];

  @ApiProperty({ isArray: true, type: () => FavoriteProduct })
  favoritedBy: FavoriteProduct[];

  @ApiProperty({ isArray: true, type: () => OrderItem })
  orderItems: OrderItem[];

  @ApiProperty({ isArray: true, type: () => ProductOptionGroup })
  optionGroups: ProductOptionGroup[];

  @ApiProperty({ isArray: true, type: () => ProductVariant })
  variants: ProductVariant[];

  @ApiProperty({ isArray: true, type: () => Promotion })
  promotions: Promotion[];

  @ApiProperty({ isArray: true, type: () => Offer })
  offers: Offer[];

  @ApiPropertyOptional({ type: () => MenuCategory })
  category?: MenuCategory;

  @ApiProperty({ type: () => Vendor })
  vendor: Vendor;
}
