import { MessageType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Message {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  conversationId: string;

  @ApiProperty({ type: String })
  senderId: string;

  @ApiProperty({ enum: MessageType, enumName: 'MessageType' })
  type: MessageType = MessageType.TEXT;

  @ApiPropertyOptional({ type: String })
  text?: string;

  @ApiPropertyOptional({ type: String })
  mediaUrl?: string;

  @ApiPropertyOptional({ type: Object })
  metadata?: object;

  @ApiPropertyOptional({ type: String })
  replyToId?: string;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiPropertyOptional({ type: Date })
  deletedAt?: Date;
}
