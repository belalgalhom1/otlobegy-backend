import { ApiProperty } from '@nestjs/swagger';

export class Cart {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  customerId: string;

  @ApiProperty({ type: String })
  vendorId: string;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
