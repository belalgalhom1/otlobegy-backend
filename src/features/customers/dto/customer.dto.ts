import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsNumber,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer'; // Added Transform here
import { ApiProperty } from '@nestjs/swagger';

// ─── Self-service DTOs ────────────────────────────────────────────────────────

export class CreateAddressDto {
  @ApiProperty({ example: 'Home', required: false })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiProperty({ example: '123 Street, Cairo' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ type: [Number], example: [30.0444, 31.2357], minItems: 2, maxItems: 2 })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  location!: [number, number];

  @ApiProperty({ example: 'Apartment 5, 2nd Floor', required: false })
  @IsString()
  @IsOptional()
  details?: string;

  @ApiProperty({ example: true, required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @ApiProperty({ example: 'Work', required: false })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiProperty({ example: '456 Avenue, Cairo', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    type: [Number],
    example: [30.0444, 31.2357],
    minItems: 2,
    maxItems: 2,
    required: false,
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  @IsOptional()
  location?: [number, number];

  @ApiProperty({ example: 'Office 301', required: false })
  @IsString()
  @IsOptional()
  details?: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

// ─── Admin-only DTOs ───────────────────────────────────────────────────────────

export class QueryCustomersDto {
  @ApiProperty({
    example: true,
    required: false,
    description: 'Filter by canOrder flag',
  })
  @IsBoolean()
  @IsOptional()
  // Transform string "true"/"false" from URL query to actual boolean
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  canOrder?: boolean;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Include soft-deleted customer records',
  })
  @IsBoolean()
  @IsOptional()
  // Same transformation for the deleted records filter
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  includeDeleted?: boolean;

  @ApiProperty({
    example: 'ahmed',
    required: false,
    description: 'Search by user name, email, or phone',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ example: 1, required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 20, required: false, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class QueryCustomerOrdersDto {
  @ApiProperty({ example: 1, required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 20, required: false, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
