import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductVariant {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  productId: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiPropertyOptional({ type: String })
  nameAr?: string;

  @ApiPropertyOptional({ type: String })
  sku?: string;

  @ApiProperty({ type: Number })
  basePrice: number;

  @ApiPropertyOptional({ type: Number })
  comparePrice?: number;

  @ApiPropertyOptional({ type: Number })
  stock?: number;

  @ApiProperty({ type: Boolean })
  isActive: boolean = true;

  @ApiProperty({ type: Number })
  version: number = 100;
}
