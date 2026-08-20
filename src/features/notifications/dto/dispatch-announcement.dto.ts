import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { NotificationType } from '@prisma/client';

export enum AnnouncementAudience {
  CUSTOMERS = 'CUSTOMERS',
  DRIVERS = 'DRIVERS',
  VENDORS = 'VENDORS',
  ALL = 'ALL',
}

export class DispatchAnnouncementDto {
  @ApiProperty({
    enum: AnnouncementAudience,
    description: 'Target audience for the broadcast',
  })
  @IsEnum(AnnouncementAudience)
  audience!: AnnouncementAudience;

  @ApiProperty({ example: 'Flash Sale!' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'تخفيضات كبرى!', required: false })
  @IsString()
  @IsOptional()
  titleAr?: string;

  @ApiProperty({ example: 'Get 50% off all orders today.' })
  @IsString()
  body!: string;

  @ApiProperty({
    example: 'احصل على خصم 50٪ على جميع الطلبات اليوم.',
    required: false,
  })
  @IsString()
  @IsOptional()
  bodyAr?: string;

  @ApiProperty({
    example: { campaignId: '123' },
    required: false,
    description: 'Optional deep link or analytics payload',
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, string>;

  @ApiProperty({
    enum: [NotificationType.ANNOUNCEMENT, NotificationType.SYSTEM],
    required: false,
    description: 'The type of notification to send. Defaults to ANNOUNCEMENT.',
    default: NotificationType.ANNOUNCEMENT,
  })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;
}
