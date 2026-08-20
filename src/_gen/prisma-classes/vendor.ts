import { VendorStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Vendor {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  storeName: string;

  @ApiPropertyOptional({ type: String })
  storeNameAr?: string;

  @ApiProperty({ type: String })
  slug: string;

  @ApiPropertyOptional({ type: String })
  description?: string;

  @ApiPropertyOptional({ type: String })
  descriptionAr?: string;

  @ApiPropertyOptional({ type: String })
  logo?: string;

  @ApiPropertyOptional({ type: String })
  coverImage?: string;

  @ApiPropertyOptional({ type: String })
  phone?: string;

  @ApiPropertyOptional({ type: String })
  taxId?: string;

  @ApiProperty({ type: Number })
  commissionRate: number = 10;

  @ApiProperty({ enum: VendorStatus, enumName: 'VendorStatus' })
  status: VendorStatus = VendorStatus.CLOSED;

  @ApiProperty({ type: Number })
  walletBalance: number;

  @ApiProperty({ type: Boolean })
  isContracted: boolean;

  @ApiPropertyOptional({ type: Object })
  workingHours?: object;

  @ApiProperty({ type: Boolean })
  isScheduleActive: boolean = true;

  @ApiProperty({ type: String })
  verticalId: string;

  @ApiPropertyOptional({ type: Date })
  deletedAt?: Date;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
