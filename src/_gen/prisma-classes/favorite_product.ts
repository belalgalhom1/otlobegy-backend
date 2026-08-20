import { ApiProperty } from '@nestjs/swagger';

export class FavoriteProduct {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  customerId: string;

  @ApiProperty({ type: String })
  productId: string;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
