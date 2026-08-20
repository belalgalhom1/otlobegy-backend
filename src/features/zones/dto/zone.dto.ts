import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateZoneDto {
  @ApiProperty({ example: 'Maadi' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'المعادي', required: false })
  @IsString()
  @IsOptional()
  nameAr?: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: 15, required: false })
  @IsNumber()
  @IsOptional()
  baseDeliveryFeeOverride?: number;

  @ApiProperty({ example: 50, required: false })
  @IsNumber()
  @IsOptional()
  minOrderAmountOverride?: number;

  @ApiProperty({
    example: [
      [
        [31.2, 30.0],
        [31.3, 30.0],
        [31.3, 30.1],
        [31.2, 30.1],
        [31.2, 30.0],
      ],
    ],
    description:
      'GeoJSON Polygon coordinates: array of linear rings (arrays of [lng, lat])',
  })
  @IsArray()
  @ArrayMinSize(1)
  boundary!: number[][][];
}

export class UpdateZoneDto {
  @ApiProperty({ example: 'Updated Zone Name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'اسم المنطقة المحدث', required: false })
  @IsString()
  @IsOptional()
  nameAr?: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: 20, required: false })
  @IsNumber()
  @IsOptional()
  baseDeliveryFeeOverride?: number;

  @ApiProperty({ example: 100, required: false })
  @IsNumber()
  @IsOptional()
  minOrderAmountOverride?: number;

  @ApiProperty({
    example: [
      [
        [31.2, 30.0],
        [31.3, 30.0],
        [31.3, 30.1],
        [31.2, 30.1],
        [31.2, 30.0],
      ],
    ],
    required: false,
  })
  @IsArray()
  @IsOptional()
  boundary?: number[][][];
}

export class CheckLocationDto {
  @ApiProperty({ example: 31.258 })
  @IsNumber()
  longitude!: number;

  @ApiProperty({ example: 30.059 })
  @IsNumber()
  latitude!: number;
}

export class SearchCustomersInPolygonDto {
  @ApiProperty({
    example: [
      [
        [31.2, 30.0],
        [31.3, 30.0],
        [31.3, 30.1],
        [31.2, 30.1],
        [31.2, 30.0],
      ],
    ],
    description: 'GeoJSON Polygon coordinates: array of linear rings (arrays of [lng, lat])',
  })
  @IsArray()
  @ArrayMinSize(1)
  polygon!: number[][][];
}
