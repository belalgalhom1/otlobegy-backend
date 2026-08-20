import { VendorMemberRole } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VendorMember {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  vendorId: string;

  @ApiProperty({ type: String })
  userId: string;

  @ApiProperty({ enum: VendorMemberRole, enumName: 'VendorMemberRole' })
  role: VendorMemberRole = VendorMemberRole.STAFF;

  @ApiPropertyOptional({ type: String })
  branchId?: string;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
