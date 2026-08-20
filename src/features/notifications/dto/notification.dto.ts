import {
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class QueryNotificationsDto {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  unreadOnly?: boolean;

  @ApiProperty({ enum: NotificationType, required: false })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiProperty({ example: 1, required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 20, required: false, default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class MarkNotificationsReadDto {
  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  ids?: string[];
}

export class CreateNotificationDto {
  @ApiProperty({ example: 'user-id-123' })
  userId!: string;

  @ApiProperty({ example: 'New Order' })
  title!: string;

  @ApiProperty({ example: 'طلب جديد', required: false })
  titleAr?: string | null;

  @ApiProperty({ example: 'Your order has been accepted', required: false })
  body?: string | null;

  @ApiProperty({ example: 'تم قبول طلبك', required: false })
  bodyAr?: string | null;

  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiProperty({ required: false })
  data?: Record<string, any>;
}
