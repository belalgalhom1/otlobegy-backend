import { NotificationType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Notification {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  userId: string;

  @ApiProperty({ type: String })
  title: string;

  @ApiPropertyOptional({ type: String })
  titleAr?: string;

  @ApiPropertyOptional({ type: String })
  body?: string;

  @ApiPropertyOptional({ type: String })
  bodyAr?: string;

  @ApiProperty({ enum: NotificationType, enumName: 'NotificationType' })
  type: NotificationType;

  @ApiProperty({ type: Boolean })
  isRead: boolean;

  @ApiPropertyOptional({ type: Object })
  data?: object;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
