import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductOption {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  groupId: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiPropertyOptional({ type: String })
  nameAr?: string;

  @ApiProperty({ type: Number })
  priceAdded: number;

  @ApiProperty({ type: Boolean })
  isActive: boolean = true;
}
