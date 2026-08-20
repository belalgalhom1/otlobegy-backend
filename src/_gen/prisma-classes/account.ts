import { ApiProperty } from '@nestjs/swagger';

export class Account {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  userId: string;

  @ApiProperty({ type: String })
  provider: string;

  @ApiProperty({ type: String })
  providerAccountId: string;
}
