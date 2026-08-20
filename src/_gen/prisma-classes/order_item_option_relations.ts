import { ProductOption } from './product_option';
import { OrderItem } from './order_item';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class OrderItemOptionRelations {
  @ApiPropertyOptional({ type: () => ProductOption })
  option?: ProductOption;

  @ApiProperty({ type: () => OrderItem })
  orderItem: OrderItem;
}
