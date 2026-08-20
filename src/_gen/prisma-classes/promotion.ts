import { PromotionType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Promotion {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  title: string;

  @ApiPropertyOptional({ type: String })
  titleAr?: string;

  @ApiPropertyOptional({ type: String })
  description?: string;

  @ApiPropertyOptional({ type: String })
  descriptionAr?: string;

  @ApiProperty({ type: String })
  imageUrl: string;

  @ApiProperty({ enum: PromotionType, enumName: 'PromotionType' })
  type: PromotionType = PromotionType.BANNER;

  @ApiPropertyOptional({ type: String })
  vendorId?: string;

  @ApiPropertyOptional({ type: String })
  productId?: string;

  @ApiPropertyOptional({ type: String })
  externalUrl?: string;

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
