import { Controller, Get } from '@nestjs/common';
import { MessagesService } from '../chat/messages.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';


@ApiTags('Inbox - Summary Counts')
@ApiBearerAuth()
@Controller('inbox')
export class InboxController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @ApiStandardResponse()
  @Get('counts')
  @ApiOperation({ summary: 'Get unread counts for chat and notifications' })
  async getCounts(@CurrentUser('sub') userId: string) {
    const [chatUnread, notificationUnread] = await Promise.all([
      this.messagesService.getUnreadCount(userId),
      this.notificationsService.getUnreadCount(userId),
    ]);

    return {
      chat: chatUnread,
      notifications: notificationUnread,
      total: chatUnread + notificationUnread,
    };
  }
}
