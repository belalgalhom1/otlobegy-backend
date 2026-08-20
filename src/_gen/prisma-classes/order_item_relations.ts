import { OrderItemOption } from './order_item_option';
import { Order } from './order';
import { Product } from './product';
import { ProductVariant } from './product_variant';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemRelations {
  @ApiProperty({ isArray: true, type: () => OrderItemOption })
  selectedOptions: OrderItemOption[];

  @ApiProperty({ type: () => Order })
  order: Order;

  @ApiPropertyOptional({ type: () => Product })
  product?: Product;

  @ApiPropertyOptional({ type: () => ProductVariant })
  variant?: ProductVariant;
}
