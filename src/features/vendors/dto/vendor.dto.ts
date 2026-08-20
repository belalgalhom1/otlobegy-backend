import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsPositive,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VendorStatus, Prisma } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVendorDto {
  @ApiProperty({ example: 'My Awesome Store' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  storeName!: string;

  @ApiProperty({ example: 'متجري الرائع', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  storeNameAr?: string;

  @ApiProperty({ example: 'Best store in town', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 'أفضل متجر في المدينة', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  descriptionAr?: string;

  @ApiProperty({ example: 'vertical-id-123' })
  @IsString()
  @IsNotEmpty()
  verticalId!: string;

  @ApiProperty({ example: 'TAX-123456', required: false })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiProperty({ example: 10, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  commissionRate?: number;

  @ApiProperty({ example: '+201234567890', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: false, required: false, default: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isContracted?: boolean;

  @ApiProperty({
    example: [
      { day: 0, openTime: '09:00', closeTime: '22:00', isClosed: false },
    ],
    required: false,
  })
  @IsOptional()
  workingHours?: Prisma.InputJsonValue;

  @ApiProperty({ example: false, required: false, default: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  is24Hours?: boolean;
}

export class UpdateVendorDto {
  @ApiProperty({ example: 'Updated Store Name', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  storeName?: string;

  @ApiProperty({ example: 'اسم المتجر المحدث', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  storeNameAr?: string;

  @ApiProperty({ example: 'Updated description', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 'وصف محدث', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  descriptionAr?: string;

  @ApiProperty({ example: 'vertical-id-456', required: false })
  @IsString()
  @IsOptional()
  verticalId?: string;

  @ApiProperty({ example: 'TAX-654321', required: false })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiProperty({ example: 12, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  commissionRate?: number;

  @ApiProperty({ example: '+201234567890', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isContracted?: boolean;

  @ApiProperty({
    example: [
      { day: 0, openTime: '09:00', closeTime: '22:00', isClosed: false },
    ],
    required: false,
  })
  @IsOptional()
  workingHours?: Prisma.InputJsonValue;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isScheduleActive?: boolean;

  @ApiProperty({ example: false, required: false, default: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  is24Hours?: boolean;
}

export class UpdateVendorStatusDto {
  @ApiProperty({ enum: VendorStatus })
  @IsEnum(VendorStatus)
  @IsNotEmpty()
  status!: VendorStatus;
}

export class QueryVendorsDto {
  @ApiProperty({ enum: VendorStatus, required: false })
  @IsEnum(VendorStatus)
  @IsOptional()
  status?: VendorStatus;

  @ApiProperty({ example: 'vertical-id-123', required: false })
  @IsString()
  @IsOptional()
  verticalId?: string;

  @ApiProperty({ example: 'pizza', required: false })
  @IsString()
  @IsOptional()
  search?: string;

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

  @ApiProperty({ example: 4, required: false, description: 'Minimum rating (0-5)' })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiProperty({ example: 'rating', required: false, enum: ['rating', 'createdAt'] })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({ example: 'desc', required: false, enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @ApiProperty({ example: 30.0444, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiProperty({ example: 31.2357, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;
}
