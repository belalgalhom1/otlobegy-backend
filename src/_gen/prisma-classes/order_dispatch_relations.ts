import { Driver } from './driver';
import { DriverShift } from './driver_shift';
import { Order } from './order';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderDispatchRelations {
  @ApiProperty({ type: () => Driver })
  driver: Driver;

  @ApiPropertyOptional({ type: () => DriverShift })
  driverShift?: DriverShift;

  @ApiProperty({ type: () => Order })
  order: Order;
}
