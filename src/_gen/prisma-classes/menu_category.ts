import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MenuCategory {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  vendorId: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiPropertyOptional({ type: String })
  nameAr?: string;

  @ApiPropertyOptional({ type: String })
  description?: string;

  @ApiPropertyOptional({ type: String })
  descriptionAr?: string;

  @ApiPropertyOptional({ type: String })
  iconUrl?: string;

  @ApiProperty({ type: Number })
  sortOrder: number;

  @ApiProperty({ type: Boolean })
  isActive: boolean = true;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
