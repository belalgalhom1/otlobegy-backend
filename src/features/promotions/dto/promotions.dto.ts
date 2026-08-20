import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsUUID,
  IsUrl,
  Min,
  IsDate,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PromotionType } from '@prisma/client';
import { Type, Transform } from 'class-transformer';

export class CreatePromotionDto {
  @ApiProperty({ example: 'Summer Sale', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  @IsOptional()
  file?: Express.Multer.File;

  @ApiProperty({ example: 'عروض الصيف', required: false })
  @IsString()
  @IsOptional()
  titleAr?: string;

  @ApiProperty({ example: 'Get 50% off on all items', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'احصل على خصم 50% على جميع المنتجات',
    required: false,
  })
  @IsString()
  @IsOptional()
  descriptionAr?: string;

  @ApiProperty({ enum: PromotionType, default: PromotionType.BANNER })
  @IsEnum(PromotionType)
  @IsOptional()
  type?: PromotionType;

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
  productId?: string;

  @ApiProperty({ example: 'https://example.com', required: false })
  @IsUrl()
  @IsOptional()
  externalUrl?: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  isActive?: boolean;

  @ApiProperty({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @ApiProperty({ required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({ required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;
}

export class CreateOfferDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  vendorId!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  originalPrice!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  offerPrice!: number;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiProperty({ required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({ required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;
}

export class UpdateOfferDto {
  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  originalPrice?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  offerPrice?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiProperty({ required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({ required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;
}

export class UpdatePromotionDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  titleAr?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  descriptionAr?: string;

  @ApiProperty({ enum: PromotionType, required: false })
  @IsEnum(PromotionType)
  @IsOptional()
  type?: PromotionType;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  vendorId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiProperty({ required: false })
  @IsUrl()
  @IsOptional()
  externalUrl?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @ApiProperty({ required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({ required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;
}
