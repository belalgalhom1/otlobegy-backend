import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Product {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: Number })
  version: number = 100;

  @ApiProperty({ type: String })
  vendorId: string;

  @ApiPropertyOptional({ type: String })
  categoryId?: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiPropertyOptional({ type: String })
  nameAr?: string;

  @ApiPropertyOptional({ type: String })
  description?: string;

  @ApiPropertyOptional({ type: String })
  descriptionAr?: string;

  @ApiPropertyOptional({ type: String })
  imageUrl?: string;

  @ApiProperty({ type: Boolean })
  sellByStrip: boolean;

  @ApiPropertyOptional({ type: Number })
  stripsPerPackage?: number;

  @ApiProperty({ type: Boolean })
  hasVariants: boolean;

  @ApiPropertyOptional({ type: Number })
  basePrice?: number;

  @ApiPropertyOptional({ type: Number })
  comparePrice?: number;

  @ApiPropertyOptional({ type: String })
  sku?: string;

  @ApiPropertyOptional({ type: Number })
  stock?: number;

  @ApiProperty({ type: Boolean })
  isActive: boolean = true;

  @ApiProperty({ type: Boolean })
  isFeatured: boolean;

  @ApiPropertyOptional({ type: Date })
  deletedAt?: Date;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
