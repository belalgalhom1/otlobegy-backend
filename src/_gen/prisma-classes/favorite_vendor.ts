import { ApiProperty } from '@nestjs/swagger';

export class FavoriteVendor {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  customerId: string;

  @ApiProperty({ type: String })
  vendorId: string;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
