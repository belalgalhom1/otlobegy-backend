import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VendorVertical {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiPropertyOptional({ type: String })
  nameAr?: string;

  @ApiProperty({ type: String })
  slug: string;

  @ApiPropertyOptional({ type: String })
  iconUrl?: string;

  @ApiProperty({ type: Boolean })
  isActive: boolean = true;

  @ApiProperty({ type: Number })
  sortOrder: number;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
