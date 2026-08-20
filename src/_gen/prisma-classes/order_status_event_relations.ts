import { Order } from './order';
import { ApiProperty } from '@nestjs/swagger';

export class OrderStatusEventRelations {
  @ApiProperty({ type: () => Order })
  order: Order;
}
