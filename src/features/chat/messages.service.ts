import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConversationStatus, MessageType, Role, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { SendMessageDto, QueryMessagesDto, MarkReadDto } from './dto/chat.dto';
import { JwtAccessPayload } from 'src/common/interfaces/jwt-payload.interface';
import { ChatMessageSentEvent } from 'src/common/events';
import { EVENTS } from 'src/common/events/event-names';
import {
  ChatErrors,
  OrderErrors,
} from 'src/common/constants/response.constants';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { ChatMediaService } from './media/media.service';

const MEDIA_TYPES = new Set<MessageType>([
  MessageType.IMAGE,
  MessageType.VIDEO,
  MessageType.AUDIO,
]);

// Minimal snapshot of the replied-to message shown inline
const REPLY_TO_INCLUDE = {
  select: {
    id: true,
    type: true,
    text: true,
    mediaUrl: true,
    deletedAt: true,
    sender: {
      select: { id: true, name: true, avatar: true },
    },
  },
};

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly storage: StorageService,
    private readonly chatMedia: ChatMediaService,
  ) {}

  async send(
    actor: JwtAccessPayload,
    conversationId: string,
    dto: SendMessageDto,
  ) {
    if (dto.type === MessageType.SYSTEM) {
      throw new ForbiddenException(ChatErrors.CANNOT_SEND_SYSTEM_MESSAGE);
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation)
      throw new NotFoundException(ChatErrors.CONVERSATION_NOT_FOUND);

    const isParticipant = conversation.participants.some(
      (p) => p.userId === actor.sub,
    );
    const isAdmin = actor.role === Role.SUPER_ADMIN;
    const isVendorMember = await this.isVendorMemberForConversation(
      actor.sub,
      actor.role,
      conversation.vendorId,
    );

    if (!isParticipant && !isAdmin && !isVendorMember) {
      this.logger.warn(
        `Access denied to send message in ${conversationId} for user ${actor.sub} with role ${actor.role}`,
      );
      throw new ForbiddenException(ChatErrors.NOT_A_PARTICIPANT);
    }

    if (conversation.status !== ConversationStatus.OPEN) {
      throw new BadRequestException(ChatErrors.CONVERSATION_CLOSED);
    }

    this.validateMessageContent(dto);

    if (dto.replyToId) {
      const replyTo = await this.prisma.message.findUnique({
        where: { id: dto.replyToId },
        select: { id: true, conversationId: true, deletedAt: true },
      });

      if (!replyTo || replyTo.conversationId !== conversationId) {
        throw new BadRequestException(ChatErrors.REPLY_TO_NOT_FOUND);
      }

      if (replyTo.deletedAt) {
        throw new BadRequestException(ChatErrors.REPLY_TO_DELETED);
      }
    }

    const message = await this.prisma.$transaction(async (tx) => {
      // Automatically join as participant if they are an authorized vendor member OR admin but not yet in the list
      if (!isParticipant && (isVendorMember || isAdmin)) {
        await tx.conversationParticipant.create({
          data: {
            conversationId,
            userId: actor.sub,
          },
        });
      }

      const msg = await tx.message.create({
        data: {
          conversationId,
          senderId: actor.sub,
          type: dto.type,
          text: dto.text ?? null,
          mediaUrl: dto.mediaUrl ?? null,
          metadata: (dto.metadata as Record<string, any>) ?? undefined,
          replyToId: dto.replyToId ?? null,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
              title: true,
              vendorMemberships: {
                select: { role: true },
              },
            },
          },
          replyTo: REPLY_TO_INCLUDE,
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      if (isParticipant) {
        await tx.conversationParticipant.update({
          where: {
            conversationId_userId: { conversationId, userId: actor.sub },
          },
          data: { lastReadAt: msg.createdAt },
        });
      }

      return msg;
    });

    const participantIds = conversation.participants.map((p) => p.userId);

    const senderRoleToEmit =
      message.sender.vendorMemberships &&
      message.sender.vendorMemberships.length > 0
        ? `VENDOR_${message.sender.vendorMemberships[0].role}`
        : message.sender.role;

    this.eventEmitter.emit(
      EVENTS.CHAT_MESSAGE_SENT,
      new ChatMessageSentEvent(
        message.id,
        conversationId,
        actor.sub,
        message.sender.name,
        senderRoleToEmit,
        participantIds,
        message.text,
        message.type,
        message.mediaUrl,
        message.metadata as Record<string, any> | null,
        message.createdAt,
      ),
    );

    this.logger.log(
      `Message sent: ${message.id} [${message.type}] in ${conversationId}`,
    );
    return this.formatMessage(message);
  }

  async sendSystemMessage(
    conversationId: string,
    text: string,
    metadata?: Record<string, any>,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        status: true,
        participants: { select: { userId: true } },
      },
    });

    if (!conversation || conversation.status !== ConversationStatus.OPEN)
      return null;

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: 'system',
        type: MessageType.SYSTEM,
        text,
        metadata: metadata ?? undefined,
      },
    });

    const participantIds = conversation.participants.map((p) => p.userId);

    this.eventEmitter.emit(
      EVENTS.CHAT_MESSAGE_SENT,
      new ChatMessageSentEvent(
        message.id,
        conversationId,
        'system',
        'System',
        'SYSTEM',
        participantIds,
        text,
        MessageType.SYSTEM,
        null,
        metadata ?? null,
        message.createdAt,
      ),
    );

    return this.formatMessage(message);
  }

  async sendAutoReply(senderId: string, conversationId: string, text: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) return null;

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        type: MessageType.TEXT,
        text,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            title: true,
            vendorMemberships: {
              select: { role: true },
            },
          },
        },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const participantIds = conversation.participants.map((p) => p.userId);

    const senderRoleToEmit =
      message.sender.vendorMemberships &&
      message.sender.vendorMemberships.length > 0
        ? `VENDOR_${message.sender.vendorMemberships[0].role}`
        : message.sender.role;

    this.eventEmitter.emit(
      EVENTS.CHAT_MESSAGE_SENT,
      new ChatMessageSentEvent(
        message.id,
        conversationId,
        senderId,
        message.sender.name,
        senderRoleToEmit,
        participantIds,
        message.text,
        message.type,
        null,
        null,
        message.createdAt,
      ),
    );

    return this.formatMessage(message);
  }

  async list(
    actor: JwtAccessPayload,
    conversationId: string,
    dto: QueryMessagesDto,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation)
      throw new NotFoundException(ChatErrors.CONVERSATION_NOT_FOUND);

    const isParticipant = conversation.participants.some(
      (p) => p.userId === actor.sub,
    );
    const isAdmin = actor.role === Role.SUPER_ADMIN;
    const isVendorMember = await this.isVendorMemberForConversation(
      actor.sub,
      actor.role,
      conversation.vendorId,
    );

    if (!isParticipant && !isAdmin && !isVendorMember) {
      this.logger.warn(
        `Access denied to list messages in ${conversationId} for user ${actor.sub} with role ${actor.role}`,
      );
      throw new ForbiddenException(ChatErrors.NOT_A_PARTICIPANT);
    }

    const { before, limit = 30 } = dto;

    let cursorFilter: Prisma.MessageWhereInput = {};
    if (before) {
      const cursorMsg = await this.prisma.message.findUnique({
        where: { id: before },
        select: { createdAt: true },
      });
      if (cursorMsg) {
        cursorFilter = { createdAt: { lt: cursorMsg.createdAt } };
      }
    }

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...cursorFilter,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            title: true,
            vendorMemberships: {
              select: { role: true },
            },
          },
        },
        replyTo: REPLY_TO_INCLUDE,
      },
    });

    const ordered = [...messages].reverse();
    const myParticipant = conversation.participants.find(
      (p) => p.userId === actor.sub,
    );

    return {
      messages: ordered.map((m) => this.formatMessage(m)),
      hasMore: messages.length === limit,
      nextCursor:
        messages.length === limit ? messages[messages.length - 1].id : null,
      myLastReadAt: myParticipant?.lastReadAt ?? null,
    };
  }

  async markRead(
    actor: JwtAccessPayload,
    conversationId: string,
    dto: MarkReadDto,
  ) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: actor.sub } },
    });

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { vendorId: true },
    });

    const isAdmin = actor.role === Role.SUPER_ADMIN;
    const isVendorMember = await this.isVendorMemberForConversation(
      actor.sub,
      actor.role,
      conversation?.vendorId ?? null,
    );

    if (!participant && !isAdmin && !isVendorMember) {
      this.logger.warn(
        `Access denied to markRead in ${conversationId} for user ${actor.sub} with role ${actor.role}`,
      );
      throw new ForbiddenException(ChatErrors.NOT_A_PARTICIPANT);
    }

    if ((isAdmin || isVendorMember) && !participant) {
      return { lastReadAt: new Date() };
    }

    let readAt = new Date();

    if (dto.lastReadMessageId) {
      const msg = await this.prisma.message.findUnique({
        where: { id: dto.lastReadMessageId },
        select: { createdAt: true, conversationId: true },
      });
      if (!msg || msg.conversationId !== conversationId) {
        throw new BadRequestException(ChatErrors.INVALID_MESSAGE_ID);
      }
      readAt = msg.createdAt;
    }

    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: actor.sub } },
      data: { lastReadAt: readAt },
    });

    return { lastReadAt: readAt };
  }

  async deleteMessage(actor: JwtAccessPayload, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, deletedAt: true, type: true },
    });

    if (!message || message.deletedAt) {
      throw new NotFoundException(ChatErrors.MESSAGE_NOT_FOUND);
    }

    if (message.type === MessageType.SYSTEM) {
      throw new ForbiddenException(ChatErrors.CANNOT_DELETE_SYSTEM_MESSAGE);
    }

    const isAdmin = actor.role === Role.SUPER_ADMIN;
    if (message.senderId !== actor.sub && !isAdmin) {
      throw new ForbiddenException(ChatErrors.NOT_MESSAGE_SENDER);
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    return { deleted: true };
  }

  async updateMessage(
    actor: JwtAccessPayload,
    messageId: string,
    dto: { text: string },
  ) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, type: true, deletedAt: true },
    });

    if (!message || message.deletedAt) {
      throw new NotFoundException(ChatErrors.MESSAGE_NOT_FOUND);
    }

    if (message.type !== MessageType.TEXT) {
      throw new BadRequestException(ChatErrors.ONLY_TEXT_CAN_BE_EDITED);
    }

    const isAdmin = actor.role === Role.SUPER_ADMIN;
    if (message.senderId !== actor.sub && !isAdmin) {
      throw new ForbiddenException(ChatErrors.NOT_MESSAGE_SENDER);
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { text: dto.text },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            title: true,
          },
        },
        replyTo: REPLY_TO_INCLUDE,
      },
    });

    return this.formatMessage(updated);
  }

  async uploadMedia(
    actor: JwtAccessPayload,
    conversationId: string,
    file: Express.Multer.File,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation)
      throw new NotFoundException(ChatErrors.CONVERSATION_NOT_FOUND);

    const isParticipant = conversation.participants.some(
      (p) => p.userId === actor.sub,
    );
    const isAdmin = actor.role === Role.SUPER_ADMIN;

    if (!isParticipant && !isAdmin) {
      throw new ForbiddenException(ChatErrors.NOT_A_PARTICIPANT);
    }

    const result = await this.chatMedia.uploadChatMedia(file, conversationId);
    return { url: result.mediaUrl };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { 
        userId,
        conversation: {
          status: { not: 'ARCHIVED' }
        }
      },
      select: { conversationId: true, lastReadAt: true },
    });

    if (participants.length === 0) return 0;

    const counts = await Promise.all(
      participants.map((p) =>
        this.prisma.message.count({
          where: {
            conversationId: p.conversationId,
            senderId: { not: userId },
            deletedAt: null,
            type: { not: MessageType.SYSTEM },
            createdAt: { gt: p.lastReadAt ?? new Date(0) },
          },
        }),
      ),
    );

    return counts.reduce((sum, count) => sum + count, 0);
  }

  private validateMessageContent(dto: SendMessageDto) {
    if (dto.type === MessageType.TEXT && !dto.text?.trim()) {
      throw new BadRequestException(ChatErrors.TEXT_REQUIRED);
    }

    if (MEDIA_TYPES.has(dto.type) && !dto.mediaUrl) {
      throw new BadRequestException(ChatErrors.MEDIA_URL_REQUIRED);
    }

    if (dto.type === MessageType.LOCATION) {
      const meta = dto.metadata as Record<string, unknown> | undefined;
      if (!meta?.lat || !meta?.lng) {
        throw new BadRequestException(ChatErrors.LOCATION_REQUIRED);
      }
    }

    if (dto.type === MessageType.PRODUCT) {
      const meta = dto.metadata as Record<string, unknown> | undefined;
      const product = meta?.product as Record<string, unknown> | undefined;
      if (
        !product ||
        typeof product.name !== 'string' ||
        typeof product.price !== 'number'
      ) {
        throw new BadRequestException(OrderErrors.INVALID_PRODUCT_MESSAGE);
      }
    }
  }

  private formatMessage(messageRaw: unknown) {
    const message = messageRaw as {
      id: string;
      conversationId: string;
      type: string;
      text: string | null;
      mediaUrl: string | null;
      metadata: Prisma.JsonValue;
      createdAt: Date;
      deletedAt: Date | null;
      sender: {
        id: string;
        name: string;
        avatar: string | null;
        role: string;
        vendorMemberships: { role: string }[];
      } | null;
      replyTo: {
        id: string;
        type: string;
        text: string | null;
        mediaUrl: string | null;
        deletedAt: Date | null;
        sender: { id: string; name: string; avatar: string | null } | null;
      } | null;
    };
    return {
      id: message.id,
      conversationId: message.conversationId,
      type: message.type,
      text: message.text,
      mediaUrl: message.mediaUrl,
      metadata: message.metadata,
      sender: message.sender
        ? {
            id: message.sender.id,
            name: message.sender.name,
            avatar: message.sender.avatar,
            role:
              message.sender.vendorMemberships &&
              message.sender.vendorMemberships.length > 0
                ? `VENDOR_${message.sender.vendorMemberships[0].role}`
                : message.sender.role,
          }
        : null,
      replyTo: message.replyTo
        ? {
            id: message.replyTo.id,
            type: message.replyTo.type,
            text: message.replyTo.deletedAt ? null : message.replyTo.text,
            mediaUrl: message.replyTo.deletedAt
              ? null
              : message.replyTo.mediaUrl,
            deleted: !!message.replyTo.deletedAt,
            sender: message.replyTo.sender
              ? {
                  id: message.replyTo.sender.id,
                  name: message.replyTo.sender.name,
                  avatar: message.replyTo.sender.avatar,
                }
              : null,
          }
        : null,
      isSystem: message.type === MessageType.SYSTEM,
      createdAt: message.createdAt,
      deletedAt: message.deletedAt ?? null,
    };
  }

  private async isVendorMemberForConversation(
    userId: string,
    role: string,
    conversationVendorId: string | null,
  ): Promise<boolean> {
    if (!conversationVendorId || role !== Role.VENDOR_MEMBER) {
      return false;
    }
    const membership = await this.prisma.vendorMember.findUnique({
      where: {
        vendorId_userId: {
          vendorId: conversationVendorId,
          userId,
        },
      },
    });
    return !!membership;
  }
}
