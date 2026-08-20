import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductOptionGroup {
  @ApiProperty({ type: String })
  id: string;

  @ApiPropertyOptional({ type: String })
  productId?: string;

  @ApiPropertyOptional({ type: String })
  variantId?: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiPropertyOptional({ type: String })
  nameAr?: string;

  @ApiProperty({ type: Boolean })
  isRequired: boolean;

  @ApiProperty({ type: Number })
  minSelect: number;

  @ApiProperty({ type: Number })
  maxSelect: number = 100;
}
