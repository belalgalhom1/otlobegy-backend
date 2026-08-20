import { AuditLog } from './audit_log';
import { ConversationParticipant } from './conversation_participant';
import { Customer } from './customer';
import { Device } from './device';
import { Driver } from './driver';
import { Message } from './message';
import { NotificationSetting } from './notification_setting';
import { Notification } from './notification';
import { Session } from './session';
import { SupportTicket } from './support_ticket';
import { VendorMember } from './vendor_member';
import { Conversation } from './conversation';
import { WalletTopUpRequest } from './wallet_top_up_request';
import { Account } from './account';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserRelations {
  @ApiProperty({ isArray: true, type: () => AuditLog })
  auditLogs: AuditLog[];

  @ApiProperty({ isArray: true, type: () => ConversationParticipant })
  conversations: ConversationParticipant[];

  @ApiPropertyOptional({ type: () => Customer })
  customer?: Customer;

  @ApiProperty({ isArray: true, type: () => Device })
  devices: Device[];

  @ApiPropertyOptional({ type: () => Driver })
  driver?: Driver;

  @ApiProperty({ isArray: true, type: () => Message })
  messages: Message[];

  @ApiPropertyOptional({ type: () => NotificationSetting })
  notificationSettings?: NotificationSetting;

  @ApiProperty({ isArray: true, type: () => Notification })
  notifications: Notification[];

  @ApiProperty({ isArray: true, type: () => Session })
  sessions: Session[];

  @ApiProperty({ isArray: true, type: () => SupportTicket })
  assignedTickets: SupportTicket[];

  @ApiProperty({ isArray: true, type: () => SupportTicket })
  createdTickets: SupportTicket[];

  @ApiProperty({ isArray: true, type: () => VendorMember })
  vendorMemberships: VendorMember[];

  @ApiProperty({ isArray: true, type: () => Conversation })
  createdConversations: Conversation[];

  @ApiProperty({ isArray: true, type: () => WalletTopUpRequest })
  approvedTopUps: WalletTopUpRequest[];

  @ApiProperty({ isArray: true, type: () => Driver })
  approvedDrivers: Driver[];

  @ApiProperty({ isArray: true, type: () => Account })
  accounts: Account[];
}
