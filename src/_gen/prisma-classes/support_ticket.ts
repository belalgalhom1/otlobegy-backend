import { TicketStatus, TicketCategory, TicketPriority } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SupportTicket {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  ticketNumber: string;

  @ApiProperty({ type: String })
  subject: string;

  @ApiPropertyOptional({ type: String })
  description?: string;

  @ApiProperty({ enum: TicketStatus, enumName: 'TicketStatus' })
  status: TicketStatus = TicketStatus.OPEN;

  @ApiProperty({ enum: TicketCategory, enumName: 'TicketCategory' })
  category: TicketCategory = TicketCategory.OTHER;

  @ApiPropertyOptional({ type: String })
  subCategory?: string;

  @ApiProperty({ enum: TicketPriority, enumName: 'TicketPriority' })
  priority: TicketPriority = TicketPriority.MEDIUM;

  @ApiProperty({ type: String })
  creatorId: string;

  @ApiPropertyOptional({ type: String })
  assigneeId?: string;

  @ApiPropertyOptional({ type: String })
  orderId?: string;

  @ApiPropertyOptional({ type: String })
  vendorId?: string;

  @ApiPropertyOptional({ type: String })
  conversationId?: string;

  @ApiProperty({ type: Date })
  lastStatusUpdateAt: Date;

  @ApiPropertyOptional({ type: Date })
  escalatedAt?: Date;

  @ApiPropertyOptional({ type: Object })
  metadata?: object;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
