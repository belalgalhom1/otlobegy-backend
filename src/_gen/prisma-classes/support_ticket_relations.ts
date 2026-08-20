import { User } from './user';
import { Conversation } from './conversation';
import { Order } from './order';
import { Vendor } from './vendor';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class SupportTicketRelations {
  @ApiPropertyOptional({ type: () => User })
  assignee?: User;

  @ApiPropertyOptional({ type: () => Conversation })
  conversation?: Conversation;

  @ApiProperty({ type: () => User })
  creator: User;

  @ApiPropertyOptional({ type: () => Order })
  order?: Order;

  @ApiPropertyOptional({ type: () => Vendor })
  vendor?: Vendor;
}
