import { ConversationType, ConversationStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Conversation {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ enum: ConversationType, enumName: 'ConversationType' })
  type: ConversationType = ConversationType.ORDER;

  @ApiPropertyOptional({ type: String })
  orderId?: string;

  @ApiProperty({ enum: ConversationStatus, enumName: 'ConversationStatus' })
  status: ConversationStatus = ConversationStatus.OPEN;

  @ApiPropertyOptional({ type: String })
  vendorId?: string;

  @ApiPropertyOptional({ type: String })
  creatorId?: string;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
