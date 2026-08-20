import { DriverShift } from './driver_shift';
import { Order } from './order';
import { VendorBranch } from './vendor_branch';
import { ShiftPool } from './shift_pool';
import { ApiProperty } from '@nestjs/swagger';

export class ZoneRelations {
  @ApiProperty({ isArray: true, type: () => DriverShift })
  driverShifts: DriverShift[];

  @ApiProperty({ isArray: true, type: () => Order })
  orders: Order[];

  @ApiProperty({ isArray: true, type: () => VendorBranch })
  vendorBranches: VendorBranch[];

  @ApiProperty({ isArray: true, type: () => ShiftPool })
  shiftPools: ShiftPool[];
}
