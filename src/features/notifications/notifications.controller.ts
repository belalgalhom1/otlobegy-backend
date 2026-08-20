import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  QueryNotificationsDto,
  MarkNotificationsReadDto,
} from './dto/notification.dto';
import { DispatchAnnouncementDto } from './dto/dispatch-announcement.dto';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { Permission } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';
import { Notification } from '../../_gen/prisma-classes/notification';


@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiStandardResponse(Notification)
  @Get()
  @ApiOperation({ summary: 'List my notifications' })
  list(
    @CurrentUser('sub') userId: string,
    @Query() dto: QueryNotificationsDto,
  ) {
    return this.notificationsService.list(userId, dto);
  }

  @ApiStandardResponse()
  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notifications count' })
  unreadCount(@CurrentUser('sub') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @ApiStandardResponse(Notification)
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific notification by ID' })
  getOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.notificationsService.getOne(userId, id);
  }

  @ApiStandardResponse()
  @Patch('read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark multiple notifications as read' })
  markRead(
    @CurrentUser('sub') userId: string,
    @Body() dto: MarkNotificationsReadDto,
  ) {
    return this.notificationsService.markRead(userId, dto);
  }

  @ApiStandardResponse(Notification)
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a specific notification as read' })
  markOneRead(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.notificationsService.markOneRead(userId, id);
  }

  @ApiStandardResponse(Notification)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a specific notification' })
  deleteOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.notificationsService.deleteOne(userId, id);
  }

  @ApiStandardResponse()
  @Delete('read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all read notifications' })
  deleteAllRead(@CurrentUser('sub') userId: string) {
    return this.notificationsService.deleteAllRead(userId);
  }

  @ApiStandardResponse()
  @Post('admin/announcements')
  @RequirePermissions(Permission.MANAGE_ANNOUNCEMENTS)
  @ApiOperation({ summary: 'Dispatch an announcement to a topic' })
  dispatchAnnouncement(@Body() dto: DispatchAnnouncementDto) {
    return this.notificationsService.dispatchAnnouncement(dto);
  }
}
