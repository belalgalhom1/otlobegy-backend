import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartItem {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  cartId: string;

  @ApiPropertyOptional({ type: String })
  productId?: string;

  @ApiPropertyOptional({ type: String })
  variantId?: string;

  @ApiPropertyOptional({ type: String })
  customName?: string;

  @ApiPropertyOptional({ type: Number })
  customPrice?: number;

  @ApiPropertyOptional({ type: String })
  customImageUrl?: string;

  @ApiProperty({ type: Number })
  quantity: number = 1;

  @ApiPropertyOptional({ type: String })
  specialRequest?: string;

  @ApiPropertyOptional({ type: String })
  optionHash?: string;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
