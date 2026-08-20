import { DriverShift } from './driver_shift';
import { ApiProperty } from '@nestjs/swagger';

export class ShiftSwapRequestRelations {
  @ApiProperty({ type: () => DriverShift })
  driverShift: DriverShift;
}
