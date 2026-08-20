import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  IsPositive,
  Min,
  MaxLength,
  IsUUID,
  IsArray,
  ValidateNested,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// ─── Option ───────────────────────────────────────────────────────────────────

export class CreateProductOptionDto {
  @ApiProperty({ example: 'Extra Cheese' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'جبنة إضافية', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  nameAr?: string;

  @ApiProperty({ example: 5, required: false, default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  priceAdded?: number;

  @ApiProperty({ example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateProductOptionDto {
  @ApiProperty({ example: 'Updated Option Name', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @ApiProperty({ example: 'اسم الخيار المحدث', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  nameAr?: string;

  @ApiProperty({ example: 10, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  priceAdded?: number;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// ─── Option Group ─────────────────────────────────────────────────────────────

export class CreateOptionGroupDto {
  @ApiProperty({ example: 'Extras' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'إضافات', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  nameAr?: string;

  @ApiProperty({ example: false, required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiProperty({ example: 0, required: false, default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minSelect?: number;

  @ApiProperty({ example: 5, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  maxSelect?: number;

  @ApiProperty({ type: [CreateProductOptionDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductOptionDto)
  @IsOptional()
  options?: CreateProductOptionDto[];
}

export class UpdateOptionGroupDto {
  @ApiProperty({ example: 'Updated Group Name', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @ApiProperty({ example: 'اسم المجموعة المحدث', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  nameAr?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minSelect?: number;

  @ApiProperty({ example: 3, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  maxSelect?: number;
}

// ─── Variant ──────────────────────────────────────────────────────────────────

export class CreateProductVariantDto {
  @ApiProperty({ example: 'Large' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'كبير', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  nameAr?: string;

  @ApiProperty({ example: 'SKU-LRG-001', required: false })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiProperty({ example: 100 })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  basePrice!: number;

  @ApiProperty({ example: 120, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  comparePrice?: number;

  @ApiProperty({ example: 50, required: false, default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiProperty({ example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ type: [CreateOptionGroupDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionGroupDto)
  @IsOptional()
  optionGroups?: CreateOptionGroupDto[];
}

export class UpdateProductVariantDto {
  @ApiProperty({ example: 'Updated Variant Name', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @ApiProperty({ example: 'اسم البديل المحدث', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  nameAr?: string;

  @ApiProperty({ example: 'NEW-SKU-123', required: false })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiProperty({ example: 110, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  basePrice?: number;

  @ApiProperty({ example: 130, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  comparePrice?: number;

  @ApiProperty({ example: 100, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  version?: number;
}

// ─── Product ──────────────────────────────────────────────────────────────────

export class CreateProductDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: 'Beef Burger' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  name!: string;

  @ApiProperty({ example: 'برجر لحم', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  nameAr?: string;

  @ApiProperty({
    example: 'Juicy beef burger with lettuce and tomato',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 'برجر لحم عصير مع خس وطماطم', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  descriptionAr?: string;

  @ApiProperty({ example: false, required: false, default: false })
  @IsBoolean()
  @IsOptional()
  hasVariants?: boolean;

  // Required when hasVariants = false
  @ApiProperty({ example: 80, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  basePrice?: number;

  @ApiProperty({ example: 100, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  comparePrice?: number;

  @ApiProperty({ example: 'BGR-001', required: false })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiProperty({ example: 100, required: false, default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiProperty({ example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: false, required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiProperty({ example: false, required: false, default: false })
  @IsBoolean()
  @IsOptional()
  sellByStrip?: boolean;

  @ApiProperty({ example: 10, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  stripsPerPackage?: number;

  // Option groups for simple (non-variant) products
  @ApiProperty({ type: [CreateOptionGroupDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionGroupDto)
  @IsOptional()
  optionGroups?: CreateOptionGroupDto[];

  // Variants (only when hasVariants = true)
  @ApiProperty({ type: [CreateProductVariantDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  @IsOptional()
  variants?: CreateProductVariantDto[];
}

export class UpdateProductDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string | null;

  @ApiProperty({ example: 'Updated Product Name', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  name?: string;

  @ApiProperty({ example: 'اسم المنتج المحدث', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  nameAr?: string;

  @ApiProperty({ example: 'Updated description', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 'وصف محدث', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  descriptionAr?: string;

  @ApiProperty({ example: 90, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  basePrice?: number;

  @ApiProperty({ example: 110, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  comparePrice?: number;

  @ApiProperty({ example: 'NEW-SKU-999', required: false })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiProperty({ example: 200, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  sellByStrip?: boolean;

  @ApiProperty({ example: 10, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  stripsPerPackage?: number;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  version?: number;
}

// ─── Query ────────────────────────────────────────────────────────────────────

export class QueryProductsDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isFeatured?: boolean;

  @ApiProperty({ example: 'burger', required: false })
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
