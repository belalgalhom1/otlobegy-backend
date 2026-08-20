import { Driver } from './driver';
import { ApiProperty } from '@nestjs/swagger';

export class DriverStatisticRelations {
  @ApiProperty({ type: () => Driver })
  driver: Driver;
}
