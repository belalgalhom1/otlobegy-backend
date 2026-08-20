import {
  OrderType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  VehicleType,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Order {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  orderNumber: string;

  @ApiProperty({ enum: OrderType, enumName: 'OrderType' })
  type: OrderType = OrderType.STANDARD;

  @ApiProperty({ type: String })
  customerId: string;

  @ApiPropertyOptional({ type: String })
  vendorId?: string;

  @ApiPropertyOptional({ type: String })
  vendorBranchId?: string;

  @ApiPropertyOptional({ type: String })
  driverId?: string;

  @ApiPropertyOptional({ type: String })
  zoneId?: string;

  @ApiPropertyOptional({ type: String })
  driverShiftId?: string;

  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  status: OrderStatus = OrderStatus.PENDING;

  @ApiProperty({ enum: PaymentMethod, enumName: 'PaymentMethod' })
  paymentMethod: PaymentMethod;

  @ApiProperty({ enum: PaymentStatus, enumName: 'PaymentStatus' })
  paymentStatus: PaymentStatus = PaymentStatus.PENDING;

  @ApiProperty({ type: String })
  deliveryAddress: string;

  @ApiPropertyOptional({ type: String })
  pickupAddress?: string;

  @ApiPropertyOptional({ type: String })
  itemDetails?: string;

  @ApiPropertyOptional({ enum: VehicleType, enumName: 'VehicleType' })
  requestedVehicleType?: VehicleType;

  @ApiProperty({ type: Number })
  subtotal: number;

  @ApiProperty({ type: Number })
  deliveryFee: number;

  @ApiProperty({ type: Number })
  driverBonusFee: number;

  @ApiProperty({ type: Number })
  serviceFee: number;

  @ApiProperty({ type: Number })
  tax: number;

  @ApiProperty({ type: Number })
  discount: number;

  @ApiProperty({ type: Number })
  coinsUsed: number;

  @ApiProperty({ type: Number })
  coinsEarned: number;

  @ApiProperty({ type: Number })
  grandTotal: number;

  @ApiProperty({ type: Number })
  upfrontAmount: number;

  @ApiPropertyOptional({ type: String })
  specialRequest?: string;

  @ApiPropertyOptional({ type: Number })
  estimatedPrepTime?: number;

  @ApiPropertyOptional({ type: Number })
  distanceKm?: number;

  @ApiPropertyOptional({ type: Date })
  deletedAt?: Date;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;

  @ApiPropertyOptional({ type: Date })
  acceptedAt?: Date;

  @ApiPropertyOptional({ type: Date })
  preparedAt?: Date;

  @ApiPropertyOptional({ type: Date })
  driverAssignedAt?: Date;

  @ApiPropertyOptional({ type: Date })
  pickedUpAt?: Date;

  @ApiPropertyOptional({ type: Date })
  actualDeliveryTime?: Date;
}
