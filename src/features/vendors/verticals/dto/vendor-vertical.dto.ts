import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVendorVerticalDto {
  @ApiProperty({ example: 'Food & Drinks' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'طعام وشراب', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  nameAr?: string;

  @ApiProperty({ example: 'food-drinks' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug!: string;

  @ApiProperty({
    example: 'https://example.com/icons/food.png',
    required: false,
  })
  @IsString()
  @IsOptional()
  iconUrl?: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: 1, required: false, default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;
}

export class UpdateVendorVerticalDto {
  @ApiProperty({ example: 'Updated Name', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 'الاسم المحدث', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  nameAr?: string;

  @ApiProperty({ example: 'updated-slug', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiProperty({
    example: 'https://example.com/icons/new-icon.png',
    required: false,
  })
  @IsString()
  @IsOptional()
  iconUrl?: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: 5, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;
}
