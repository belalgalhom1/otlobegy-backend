import { Conversation } from './conversation';
import { User } from './user';
import { ApiProperty } from '@nestjs/swagger';

export class ConversationParticipantRelations {
  @ApiProperty({ type: () => Conversation })
  conversation: Conversation;

  @ApiProperty({ type: () => User })
  user: User;
}
