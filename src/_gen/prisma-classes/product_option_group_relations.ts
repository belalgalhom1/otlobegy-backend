import { Product } from './product';
import { ProductVariant } from './product_variant';
import { ProductOption } from './product_option';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class ProductOptionGroupRelations {
  @ApiPropertyOptional({ type: () => Product })
  product?: Product;

  @ApiPropertyOptional({ type: () => ProductVariant })
  variant?: ProductVariant;

  @ApiProperty({ isArray: true, type: () => ProductOption })
  options: ProductOption[];
}
