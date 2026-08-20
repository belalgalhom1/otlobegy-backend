import { DevicePlatform } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class Device {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  token: string;

  @ApiProperty({ enum: DevicePlatform, enumName: 'DevicePlatform' })
  platform: DevicePlatform;

  @ApiProperty({ type: String })
  userId: string;

  @ApiProperty({ type: Date })
  lastActive: Date;
}
