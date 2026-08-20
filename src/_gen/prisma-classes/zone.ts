import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Zone {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiPropertyOptional({ type: String })
  nameAr?: string;

  @ApiProperty({ type: Boolean })
  isActive: boolean = true;

  @ApiPropertyOptional({ type: Number })
  baseDeliveryFeeOverride?: number;

  @ApiPropertyOptional({ type: Number })
  minOrderAmountOverride?: number;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
