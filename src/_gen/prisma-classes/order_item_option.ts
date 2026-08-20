import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemOption {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  orderItemId: string;

  @ApiPropertyOptional({ type: String })
  optionId?: string;

  @ApiProperty({ type: String })
  optionName: string;

  @ApiProperty({ type: Number })
  priceAdded: number;
}
