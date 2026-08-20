import { Zone } from './zone';
import { DriverShift } from './driver_shift';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class ShiftPoolRelations {
  @ApiPropertyOptional({ type: () => Zone })
  zone?: Zone;

  @ApiProperty({ isArray: true, type: () => DriverShift })
  driverShifts: DriverShift[];
}
