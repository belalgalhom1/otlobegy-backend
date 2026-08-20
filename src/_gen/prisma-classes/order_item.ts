import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItem {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  orderId: string;

  @ApiPropertyOptional({ type: String })
  productId?: string;

  @ApiPropertyOptional({ type: String })
  variantId?: string;

  @ApiProperty({ type: String })
  productName: string;

  @ApiPropertyOptional({ type: String })
  variantName?: string;

  @ApiProperty({ type: Number })
  unitPrice: number;

  @ApiProperty({ type: Number })
  quantity: number;

  @ApiProperty({ type: Number })
  totalPrice: number;

  @ApiPropertyOptional({ type: String })
  specialRequest?: string;
}
