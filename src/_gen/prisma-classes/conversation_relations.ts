import { ConversationParticipant } from './conversation_participant';
import { User } from './user';
import { Vendor } from './vendor';
import { Message } from './message';
import { SupportTicket } from './support_ticket';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConversationRelations {
  @ApiProperty({ isArray: true, type: () => ConversationParticipant })
  participants: ConversationParticipant[];

  @ApiPropertyOptional({ type: () => User })
  creator?: User;

  @ApiPropertyOptional({ type: () => Vendor })
  vendor?: Vendor;

  @ApiProperty({ isArray: true, type: () => Message })
  messages: Message[];

  @ApiPropertyOptional({ type: () => SupportTicket })
  supportTicket?: SupportTicket;
}
