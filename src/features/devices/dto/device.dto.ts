import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { DevicePlatform } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty({ example: 'fcm-token-123' })
  @IsNotEmpty()
  @IsString()
  token!: string;

  @ApiProperty({ enum: DevicePlatform })
  @IsNotEmpty()
  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;
}
