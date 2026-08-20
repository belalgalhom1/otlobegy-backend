import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Offer {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  productId: string;

  @ApiProperty({ type: String })
  vendorId: string;

  @ApiProperty({ type: Number })
  originalPrice: number;

  @ApiProperty({ type: Number })
  offerPrice: number;

  @ApiProperty({ type: Boolean })
  isActive: boolean = true;

  @ApiProperty({ type: Number })
  sortOrder: number;

  @ApiPropertyOptional({ type: Date })
  startDate?: Date;

  @ApiPropertyOptional({ type: Date })
  endDate?: Date;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
