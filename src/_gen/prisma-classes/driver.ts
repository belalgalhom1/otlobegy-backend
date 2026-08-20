import { VehicleType, DriverTier, DriverStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Driver {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  userId: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiPropertyOptional({ type: String })
  avatar?: string;

  @ApiPropertyOptional({ type: String })
  nationalId?: string;

  @ApiPropertyOptional({ type: String })
  licenseNumber?: string;

  @ApiProperty({ enum: VehicleType, enumName: 'VehicleType' })
  vehicleType: VehicleType = VehicleType.MOTORCYCLE;

  @ApiPropertyOptional({ type: String })
  vehiclePlate?: string;

  @ApiProperty({ enum: DriverTier, enumName: 'DriverTier' })
  tier: DriverTier = DriverTier.GOLD;

  @ApiProperty({ enum: DriverStatus, enumName: 'DriverStatus' })
  status: DriverStatus = DriverStatus.OFFLINE;

  @ApiPropertyOptional({ type: Date })
  lastLocationUpdate?: Date;

  @ApiProperty({ type: Number })
  rating: number = 500;

  @ApiProperty({ type: Number })
  totalOrders: number;

  @ApiProperty({ type: Number })
  walletBalance: number;

  @ApiProperty({ type: Boolean })
  hasUnpaidCommission: boolean;

  @ApiProperty({ type: Number })
  version: number = 100;

  @ApiPropertyOptional({ type: Date })
  deletedAt?: Date;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;

  @ApiProperty({ type: Boolean })
  isApproved: boolean;

  @ApiPropertyOptional({ type: Date })
  approvedAt?: Date;

  @ApiPropertyOptional({ type: String })
  approvedById?: string;
}
