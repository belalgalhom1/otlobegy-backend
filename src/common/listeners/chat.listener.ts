import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MessageType, NotificationType } from '@prisma/client';
import { SocketService } from '../../infrastructure/socket/socket.service';
import {
  NotificationsService,
  SOCKET_EVENTS,
} from '../../features/notifications/notifications.service';
import {
  ChatMessageSentEvent,
  ChatConversationCreatedEvent,
  ChatConversationClosedEvent,
} from '../events';
import { EVENTS } from '../events/event-names';

@Injectable()
export class ChatListener {
  private readonly logger = new Logger(ChatListener.name);

  constructor(
    private readonly socketService: SocketService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @OnEvent(EVENTS.CHAT_MESSAGE_SENT)
  async handleMessageSent(event: ChatMessageSentEvent) {
    const isSystem = event.type === MessageType.SYSTEM;

    const socketPayload = {
      messageId: event.messageId,
      conversationId: event.conversationId,
      senderId: event.senderId,
      senderName: event.senderName,
      senderRole: event.senderRole,
      type: event.type,
      text: event.text,
      mediaUrl: event.mediaUrl,
      metadata: event.metadata,
      isSystem,
      createdAt: event.createdAt,
    };

    this.logger.log(
      `📣 Notifying participants: ${event.participantIds.join(', ')}`,
    );
    await Promise.all(
      event.participantIds.map((userId) =>
        this.socketService
          .emitToUser(userId, SOCKET_EVENTS.CHAT_MESSAGE, socketPayload)
          .catch((err: unknown) =>
            this.logger.error(
              `Failed to emit SOCKET_EVENTS.CHAT_MESSAGE for user ${userId}: ${err instanceof Error ? err.message : String(err)}`,
            ),
          ),
      ),
    );

    if (isSystem) return;

    const recipients = event.participantIds.filter(
      (id) => id !== event.senderId,
    );
    const preview = this.buildPreview(event);

    const notificationPayloads = recipients.map((userId) => ({
      userId,
      title: 'New message',
      titleAr: 'رسالة جديدة',
      body: preview,
      bodyAr: null,
      type: NotificationType.CHAT_MESSAGE,
      data: {
        conversationId: event.conversationId,
        messageId: event.messageId,
        senderId: event.senderId,
      },
    }));

    await this.notificationsService
      .createMany(notificationPayloads)
      .catch((err: unknown) =>
        this.logger.error(
          `Failed to batch create chat notifications: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
  }

  @OnEvent(EVENTS.CHAT_CONVERSATION_CREATED)
  async handleConversationCreated(event: ChatConversationCreatedEvent) {
    const payload = {
      conversationId: event.conversationId,
      type: event.type,
      orderId: event.orderId,
    };

    await Promise.all(
      event.participantIds.map((userId) =>
        this.socketService
          .emitToUser(userId, SOCKET_EVENTS.CONVERSATION_CREATED, payload)
          .catch((err: unknown) =>
            this.logger.error(
              `Failed to emit SOCKET_EVENTS.CONVERSATION_CREATED for user ${userId}: ${err instanceof Error ? err.message : String(err)}`,
            ),
          ),
      ),
    );
  }

  @OnEvent(EVENTS.CHAT_CONVERSATION_CLOSED)
  async handleConversationClosed(event: ChatConversationClosedEvent) {
    const payload = {
      conversationId: event.conversationId,
      closedBy: event.closedBy,
    };

    await Promise.all(
      event.participantIds.map((userId) =>
        this.socketService
          .emitToUser(userId, SOCKET_EVENTS.CONVERSATION_CLOSED, payload)
          .catch((err: unknown) =>
            this.logger.error(
              `Failed to emit SOCKET_EVENTS.CONVERSATION_CLOSED for user ${userId}: ${err instanceof Error ? err.message : String(err)}`,
            ),
          ),
      ),
    );
  }

  private buildPreview(event: ChatMessageSentEvent): string {
    if (event.text) {
      return event.text.length > 80
        ? event.text.slice(0, 80) + '…'
        : event.text;
    }

    switch (event.type as MessageType) {
      case MessageType.IMAGE:
        return 'Sent a photo';
      case MessageType.VIDEO:
        return 'Sent a video';
      case MessageType.AUDIO:
        return 'Sent a voice message';
      case MessageType.LOCATION:
        return 'Shared a location';
      default:
        return 'New message';
    }
  }
}
