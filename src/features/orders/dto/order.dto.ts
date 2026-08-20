import {
  IsUUID,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsNumber,
  IsInt,
  Min,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  OrderStatus,
  PaymentMethod,
  OrderType,
  VehicleType,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemUpdateDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  variantId?: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  optionIds?: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  specialRequest?: string;
}

export class EditOrderItemsDto {
  @ApiProperty({ type: [OrderItemUpdateDto] })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => OrderItemUpdateDto)
  items!: OrderItemUpdateDto[];
}

export class PlaceOrderDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  vendorId!: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod!: PaymentMethod;

  @ApiProperty({ example: '123 Street, Cairo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  deliveryAddress!: string;

  @ApiProperty({
    example: [31.2357, 30.0444],
    description: '[longitude, latitude]', type: [Number],
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  deliveryLocation!: [number, number];

  @ApiProperty({ example: 'Extra napkins please', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  specialRequest?: string;

  @ApiProperty({
    example: 50,
    required: false,
    description: 'Number of coins to use for partial or full payment',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  coinsToUse?: number;
}

export class PlaceCustomOrderDto {
  @ApiProperty({ enum: [OrderType.CUSTOM_DELIVERY, OrderType.RIDE] })
  @IsEnum(OrderType)
  @IsNotEmpty()
  type!: OrderType;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod!: PaymentMethod;

  @ApiProperty({ example: '123 Street, Cairo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  pickupAddress!: string;

  @ApiProperty({
    example: [31.2357, 30.0444],
    description: '[longitude, latitude]', type: [Number],
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  pickupLocation!: [number, number];

  @ApiProperty({ example: '456 Avenue, Giza' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  deliveryAddress!: string;

  @ApiProperty({
    example: [31.2, 30.0111],
    description: '[longitude, latitude]', type: [Number],
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  deliveryLocation!: [number, number];

  @ApiProperty({ enum: VehicleType })
  @IsEnum(VehicleType)
  @IsNotEmpty()
  vehicleType!: VehicleType;

  @ApiProperty({ example: 'A small box with documents', required: false })
  @ValidateIf((o: PlaceCustomOrderDto) => o.type === OrderType.CUSTOM_DELIVERY)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  itemDetails?: string;

  @ApiProperty({ example: 'Fragile!', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  specialRequest?: string;

  @ApiProperty({
    example: 50,
    required: false,
    description: 'Number of coins to use for partial or full payment',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  coinsToUse?: number;
}

export class PlaceDirectOrderDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  customerId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  vendorId!: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  productName?: string;

  @ApiProperty({ example: 150 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  price!: number;

  @ApiProperty({ example: 1, default: 1 })
  @IsInt()
  @Min(1)
  @Max(99)
  @IsOptional()
  @Type(() => Number)
  quantity?: number = 1;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.CASH_ON_DELIVERY })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod = PaymentMethod.CASH_ON_DELIVERY;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  deliveryAddress?: string;

  @ApiProperty({
    example: [31.2357, 30.0444],
    description: '[longitude, latitude]', type: [Number],
    required: false,
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  @IsOptional()
  deliveryLocation?: [number, number];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  specialRequest?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status!: OrderStatus;

  @ApiProperty({ example: 'Out of stock', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  note?: string;

  @ApiProperty({
    example: 20,
    description: 'Estimated prep time in minutes (for ACCEPTED)',
    required: false,
  })
  @IsInt()
  @Min(1)
  @Max(120)
  @IsOptional()
  @Type(() => Number)
  estimatedPrepTime?: number;
}

export class RespondToDispatchDto {
  @ApiProperty({ enum: ['ACCEPTED', 'REJECTED'] })
  @IsEnum(['ACCEPTED', 'REJECTED'])
  @IsNotEmpty()
  response!: 'ACCEPTED' | 'REJECTED';
}

export class QueryOrdersDto {
  @ApiProperty({ enum: OrderStatus, required: false })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  vendorId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  driverId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ example: 1, required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 20, required: false, default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class AdminAssignDriverDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  driverId!: string;
}

export class ConfirmPaymentDto {
  @ApiProperty({ example: true })
  @IsNotEmpty()
  received!: boolean;
}


