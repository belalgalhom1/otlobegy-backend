import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Address {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  label: string = 'Home';

  @ApiProperty({ type: String })
  address: string;

  @ApiPropertyOptional({ type: String })
  details?: string;

  @ApiProperty({ type: Boolean })
  isDefault: boolean;

  @ApiProperty({ type: String })
  customerId: string;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
