import { ApiProperty } from '@nestjs/swagger';

export class CartItemOption {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  cartItemId: string;

  @ApiProperty({ type: String })
  optionId: string;
}
