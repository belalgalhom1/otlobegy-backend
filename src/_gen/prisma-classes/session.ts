import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Session {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  userId: string;

  @ApiProperty({ type: String })
  hashedRt: string;

  @ApiPropertyOptional({ type: String })
  ipAddress?: string;

  @ApiPropertyOptional({ type: String })
  userAgent?: string;

  @ApiProperty({ type: Date })
  expiresAt: Date;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
