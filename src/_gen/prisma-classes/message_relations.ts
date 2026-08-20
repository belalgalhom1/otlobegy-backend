import { Conversation } from './conversation';
import { Message } from './message';
import { User } from './user';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageRelations {
  @ApiProperty({ type: () => Conversation })
  conversation: Conversation;

  @ApiPropertyOptional({ type: () => Message })
  replyTo?: Message;

  @ApiProperty({ isArray: true, type: () => Message })
  replies: Message[];

  @ApiProperty({ type: () => User })
  sender: User;
}
