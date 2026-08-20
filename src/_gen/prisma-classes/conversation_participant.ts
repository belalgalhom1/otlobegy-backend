import { ApiProperty } from '@nestjs/swagger';

export class ConversationParticipant {
  @ApiProperty({ type: String })
  conversationId: string;

  @ApiProperty({ type: String })
  userId: string;

  @ApiProperty({ type: Date })
  joinedAt: Date;

  @ApiProperty({ type: Date })
  lastReadAt: Date;
}
