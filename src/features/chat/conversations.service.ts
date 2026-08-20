import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ConversationStatus,
  ConversationType,
  Role,
  Permission,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  CreateDirectConversationDto,
  CreateOrderConversationDto,
  CreateSupportConversationDto,
  CreateVendorConversationDto,
  QueryConversationsDto,
} from './dto/chat.dto';
import { JwtAccessPayload } from 'src/common/interfaces/jwt-payload.interface';
import {
  ChatConversationCreatedEvent,
  ChatConversationClosedEvent,
} from 'src/common/events';
import { EVENTS } from 'src/common/events/event-names';
import {
  TicketErrors,
  UserErrors,
  ChatErrors,
} from 'src/common/constants/response.constants';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async canManageConversations(
    actorId: string,
    actorRole: Role,
  ): Promise<boolean> {
    if (actorRole === Role.SUPER_ADMIN) return true;

    const user = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { permissions: true },
    });

    return (
      !!user &&
      (user.permissions.includes(Permission.MANAGE_CONVERSATIONS) ||
        user.permissions.includes(Permission.MANAGE_TICKETS))
    );
  }

  // ─── System-level conversation creation ───────────────────────────────────

  async createSystemOrderConversation(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        type: true,
        customerId: true,
        vendorId: true,
        vendorBranchId: true,
        driverId: true,
        customer: { select: { userId: true } },
        driver: { select: { userId: true } },
      },
    });

    if (!order) return null;

    const existing = await this.prisma.conversation.findFirst({
      where: {
        orderId: orderId,
        type: ConversationType.ORDER,
        status: ConversationStatus.OPEN,
      },
    });

    if (existing) return existing;

    let vendorMembers: { userId: string }[] = [];
    if (order.vendorId) {
      vendorMembers = await this.prisma.vendorMember.findMany({
        where: {
          vendorId: order.vendorId,
          OR: [
            { branchId: null },
            { branchId: order.vendorBranchId ?? undefined },
          ],
        },
        select: { userId: true },
      });
    }

    const participantUserIds = [
      order.customer.userId,
      ...vendorMembers.map((m) => m.userId),
    ];

    if (order.driver?.userId) {
      participantUserIds.push(order.driver.userId);
    }

    const uniqueParticipantIds = [...new Set(participantUserIds)];

    const conversation = await this.prisma.conversation.create({
      data: {
        type: ConversationType.ORDER,
        orderId: order.id,
        vendorId: order.vendorId,
        creatorId: null, // System created
        status: ConversationStatus.OPEN,
        participants: {
          create: uniqueParticipantIds.map((userId) => ({ userId })),
        },
      },
    });

    this.eventEmitter.emit(
      EVENTS.CHAT_CONVERSATION_CREATED,
      new ChatConversationCreatedEvent(
        conversation.id,
        uniqueParticipantIds,
        ConversationType.ORDER,
        orderId,
      ),
    );

    this.logger.log(`System Order conversation created for order ${orderId}`);
    return conversation;
  }

  async addParticipantToOrderConversation(orderId: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        orderId,
        type: ConversationType.ORDER,
        status: ConversationStatus.OPEN,
      },
      include: { participants: true },
    });

    if (!conversation) return null;

    const isAlreadyParticipant = conversation.participants.some(
      (p) => p.userId === userId,
    );
    if (!isAlreadyParticipant) {
      await this.prisma.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId,
        },
      });
      this.logger.log(
        `User ${userId} added to order conversation ${conversation.id}`,
      );

      const participantUserIds = [
        ...conversation.participants.map((p) => p.userId),
        userId,
      ];

      this.eventEmitter.emit(
        EVENTS.CHAT_CONVERSATION_CREATED,
        new ChatConversationCreatedEvent(
          conversation.id,
          participantUserIds,
          ConversationType.ORDER,
          orderId,
        ),
      );
    }
    return conversation;
  }

  async createOrderConversation(
    actor: JwtAccessPayload,
    dto: CreateOrderConversationDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      select: {
        id: true,
        customerId: true,
        vendorId: true,
        driverId: true,
        customer: { select: { userId: true } },
        driver: { select: { userId: true } },
      },
    });

    if (!order) throw new NotFoundException(ChatErrors.ORDER_NOT_FOUND);

    const isCustomer = order.customer.userId === actor.sub;
    const isVendorMember =
      actor.role === Role.VENDOR_MEMBER ||
      (await this.canManageConversations(actor.sub, actor.role));
    const isDriver = order.driver?.userId === actor.sub;

    if (!isCustomer && !isVendorMember && !isDriver) {
      throw new ForbiddenException(ChatErrors.NOT_AUTHORIZED);
    }

    const existing = await this.prisma.conversation.findFirst({
      where: {
        orderId: dto.orderId,
        type: ConversationType.ORDER,
        status: ConversationStatus.OPEN,
      },
      include: this.conversationIncludes(actor.sub),
    });

    if (existing) {
      const isAlreadyParticipant = existing.participants.some(
        (p) => p.userId === actor.sub,
      );
      if (isDriver && !isAlreadyParticipant) {
        await this.addParticipantToOrderConversation(dto.orderId, actor.sub);
        const updated = await this.prisma.conversation.findUnique({
          where: { id: existing.id },
          include: this.conversationIncludes(actor.sub),
        });
        return this.formatConversation(updated, actor.sub);
      }
      return this.formatConversation(existing, actor.sub);
    }

    const vendorMembers = order.vendorId
      ? await this.prisma.vendorMember.findMany({
          where: {
            vendorId: order.vendorId,
            OR: [
              { branchId: null },
              { branchId: (order as any).vendorBranchId ?? undefined },
            ],
          },
          select: { userId: true },
        })
      : [];

    const participantUserIds = [
      ...new Set([
        order.customer.userId,
        ...(order.driver?.userId ? [order.driver.userId] : []),
        ...vendorMembers.map((m) => m.userId),
      ]),
    ];

    const conversation = await this.prisma.conversation.create({
      data: {
        type: ConversationType.ORDER,
        orderId: dto.orderId,
        vendorId: order.vendorId,
        creatorId: actor.sub,
        status: ConversationStatus.OPEN,
        participants: {
          create: participantUserIds.map((userId) => ({ userId })),
        },
      },
      include: this.conversationIncludes(actor.sub),
    });

    this.eventEmitter.emit(
      EVENTS.CHAT_CONVERSATION_CREATED,
      new ChatConversationCreatedEvent(
        conversation.id,
        participantUserIds,
        ConversationType.ORDER,
        dto.orderId,
      ),
    );

    this.logger.log(
      `Order conversation created: ${conversation.id} (order ${dto.orderId})`,
    );
    return this.formatConversation(conversation, actor.sub);
  }

  async createSupportConversation(
    actor: JwtAccessPayload,
    dto: CreateSupportConversationDto,
  ) {
    let participantUserIds = [actor.sub];
    let vendorId: string | null = null;

    if (dto.vendorId) {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: dto.vendorId },
        select: { id: true },
      });
      if (!vendor) throw new NotFoundException(ChatErrors.VENDOR_NOT_FOUND);
      vendorId = vendor.id;

      const vendorMembers = await this.prisma.vendorMember.findMany({
        where: { vendorId: vendor.id },
        select: { userId: true },
      });
      participantUserIds.push(...vendorMembers.map((m) => m.userId));
    }

    // Unique IDs only
    participantUserIds = [...new Set(participantUserIds)];

    // Check for existing open support conversation for this user and vendor
    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: ConversationType.SUPPORT,
        vendorId,
        creatorId: actor.sub,
        status: ConversationStatus.OPEN,
      },
      include: this.conversationIncludes(actor.sub),
    });

    if (existing) {
      this.logger.debug(
        `Reusing existing support conversation: ${existing.id}`,
      );
      return this.formatConversation(existing, actor.sub);
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        type: ConversationType.SUPPORT,
        vendorId,
        creatorId: actor.sub,
        status: ConversationStatus.OPEN,
        participants: {
          create: participantUserIds.map((userId) => ({ userId })),
        },
      },
      include: this.conversationIncludes(actor.sub),
    });

    this.eventEmitter.emit(
      EVENTS.CHAT_CONVERSATION_CREATED,
      new ChatConversationCreatedEvent(
        conversation.id,
        participantUserIds,
        ConversationType.SUPPORT,
        null,
      ),
    );

    return this.formatConversation(conversation, actor.sub);
  }

  async createVendorConversation(
    actor: JwtAccessPayload,
    dto: { vendorId: string },
  ) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: dto.vendorId },
      select: { id: true },
    });

    if (!vendor) throw new NotFoundException(ChatErrors.VENDOR_NOT_FOUND);

    const existing = await this.prisma.conversation.findFirst({
      where: {
        vendorId: dto.vendorId,
        type: ConversationType.VENDOR,
        status: ConversationStatus.OPEN,
        participants: { some: { userId: actor.sub } },
      },
      include: this.conversationIncludes(actor.sub),
    });

    if (existing) return this.formatConversation(existing, actor.sub);

    const vendorMembers = await this.prisma.vendorMember.findMany({
      where: { vendorId: dto.vendorId },
      select: { userId: true },
    });

    const participantUserIds = [
      ...new Set([actor.sub, ...vendorMembers.map((m) => m.userId)]),
    ];

    const conversation = await this.prisma.conversation.create({
      data: {
        type: ConversationType.VENDOR,
        vendorId: dto.vendorId,
        creatorId: actor.sub,
        status: ConversationStatus.OPEN,
        participants: {
          create: participantUserIds.map((userId) => ({ userId })),
        },
      },
      include: this.conversationIncludes(actor.sub),
    });

    this.eventEmitter.emit(
      EVENTS.CHAT_CONVERSATION_CREATED,
      new ChatConversationCreatedEvent(
        conversation.id,
        participantUserIds,
        ConversationType.VENDOR,
        null,
      ),
    );

    this.logger.log(
      `Vendor conversation created: ${conversation.id} (vendor ${dto.vendorId}) by user ${actor.sub}`,
    );

    return this.formatConversation(conversation, actor.sub);
  }

  async createDirectConversation(
    actor: JwtAccessPayload,
    dto: CreateDirectConversationDto,
  ) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: { vendorMemberships: true },
    });

    if (!targetUser) throw new NotFoundException(UserErrors.USER_NOT_FOUND);

    // If target is a vendor member, route to VENDOR conversation
    if (
      targetUser.role === Role.VENDOR_MEMBER &&
      targetUser.vendorMemberships.length > 0
    ) {
      return this.createVendorConversation(actor, {
        vendorId: targetUser.vendorMemberships[0].vendorId,
      });
    }

    // Otherwise (CUSTOMER, DRIVER, etc.), route to SUPPORT conversation
    // Check if an existing general SUPPORT conversation exists with this user
    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: ConversationType.SUPPORT,
        vendorId: null,
        status: ConversationStatus.OPEN,
        participants: {
          some: { userId: dto.userId },
        },
      },
      include: this.conversationIncludes(actor.sub),
    });

    if (existing) return this.formatConversation(existing, actor.sub);

    // Create a new SUPPORT conversation
    const participantUserIds = [actor.sub, dto.userId];

    const conversation = await this.prisma.conversation.create({
      data: {
        type: ConversationType.SUPPORT,
        creatorId: actor.sub,
        status: ConversationStatus.OPEN,
        participants: {
          create: participantUserIds.map((userId) => ({ userId })),
        },
      },
      include: this.conversationIncludes(actor.sub),
    });

    this.eventEmitter.emit(
      EVENTS.CHAT_CONVERSATION_CREATED,
      new ChatConversationCreatedEvent(
        conversation.id,
        participantUserIds,
        ConversationType.SUPPORT,
        null,
      ),
    );

    return this.formatConversation(conversation, actor.sub);
  }

  async listMyConversations(
    actor: JwtAccessPayload,
    dto: QueryConversationsDto,
  ) {
    const { page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const isAdmin = await this.canManageConversations(actor.sub, actor.role);

    const where: Prisma.ConversationWhereInput = {
      status: { not: ConversationStatus.ARCHIVED },
    };

    if (!isAdmin) {
      where.participants = { some: { userId: actor.sub } };
    }

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: this.conversationIncludes(actor.sub),
      }),
      this.prisma.conversation.count({
        where,
      }),
    ]);

    return {
      conversations: conversations.map((c) =>
        this.formatConversation(c, actor.sub),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getConversation(actor: JwtAccessPayload, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: this.conversationIncludes(actor.sub),
    });

    if (!conversation)
      throw new NotFoundException(ChatErrors.CONVERSATION_NOT_FOUND);

    await this.assertParticipant(conversation, actor);
    return this.formatConversation(conversation, actor.sub);
  }

  async closeConversation(actor: JwtAccessPayload, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation)
      throw new NotFoundException(ChatErrors.CONVERSATION_NOT_FOUND);

    await this.assertParticipant(conversation, actor);

    if (conversation.status !== ConversationStatus.OPEN) {
      throw new BadRequestException(ChatErrors.CONVERSATION_NOT_OPEN);
    }

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: ConversationStatus.CLOSED },
    });

    const participantIds = conversation.participants.map((p) => p.userId);

    this.eventEmitter.emit(
      EVENTS.CHAT_CONVERSATION_CLOSED,
      new ChatConversationClosedEvent(
        conversationId,
        participantIds,
        actor.sub,
      ),
    );

    return updated;
  }

  async assertParticipant(
    conversation: { participants: { userId: string }[] },
    actor: JwtAccessPayload,
  ) {
    if (conversation.participants.some((p) => p.userId === actor.sub)) {
      return;
    }

    const canManage = await this.canManageConversations(actor.sub, actor.role);

    if (!canManage) {
      throw new ForbiddenException(ChatErrors.NOT_A_PARTICIPANT);
    }
  }

  private conversationIncludes(_viewerUserId?: string) {
    return {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
              phone: true,
              vendorMemberships: {
                select: { role: true },
              },
            },
          },
        },
      },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' as const },
        take: 1,
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
      },
      creator: {
        select: {
          id: true,
          name: true,
          avatar: true,
          role: true,
          phone: true,
          vendorMemberships: {
            select: { role: true },
          },
        },
      },
      vendor: {
        select: { id: true, storeName: true, storeNameAr: true },
      },
      order: {
        select: { orderNumber: true },
      },
      _count: {
        select: { messages: true },
      },
    };
  }

  private formatConversation(conversationRaw: unknown, viewerUserId: string) {
    const conversation = conversationRaw as {
      id: string;
      type: string;
      status: string;
      orderId: string | null;
      vendorId: string | null;
      createdAt: Date;
      updatedAt: Date;
      participants: {
        userId: string;
        lastReadAt: Date | null;
        joinedAt: Date;
        user: {
          name: string;
          avatar: string | null;
          role: string;
          phone: string | null;
          vendorMemberships: { role: string }[];
        };
      }[];
      messages: {
        id: string;
        type: string;
        text: string | null;
        mediaUrl: string | null;
        senderId: string;
        createdAt: Date;
        sender: {
          name: string;
          role: string;
          title: string | null;
          vendorMemberships: { role: string }[];
        };
      }[];
      creator: {
        id: string;
        name: string;
        avatar: string | null;
        role: string;
        phone: string | null;
        vendorMemberships: { role: string }[];
      } | null;
      vendor: { storeName: string; storeNameAr: string | null } | null;
      order: { orderNumber: string } | null;
      _count: { messages: number } | null;
    };

    const myParticipant = conversation.participants.find(
      (p) => p.userId === viewerUserId,
    );

    const lastMessage = conversation.messages[0] ?? null;

    return {
      id: conversation.id,
      creator: conversation.creator
        ? {
            id: conversation.creator.id,
            name: conversation.creator.name,
            avatar: conversation.creator.avatar,
            role:
              conversation.creator.vendorMemberships &&
              conversation.creator.vendorMemberships.length > 0
                ? `VENDOR_${conversation.creator.vendorMemberships[0].role}`
                : conversation.creator.role,
            phoneNumber: conversation.creator.phone,
          }
        : null,
      type: conversation.type,
      status: conversation.status,
      orderId: conversation.orderId,
      order: conversation.order,
      vendorId: conversation.vendorId,
      vendorName: conversation.vendor?.storeName,
      vendorNameAr: conversation.vendor?.storeNameAr,
      participants: conversation.participants.map((p) => ({
        userId: p.userId,
        name: p.user.name,
        avatar: p.user.avatar,
        role:
          p.user.vendorMemberships && p.user.vendorMemberships.length > 0
            ? `VENDOR_${p.user.vendorMemberships[0].role}`
            : p.user.role,
        phoneNumber: p.user.phone,
        lastReadAt: p.lastReadAt,
        joinedAt: p.joinedAt,
      })),
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            type: lastMessage.type,
            text: lastMessage.text,
            mediaUrl: lastMessage.mediaUrl,
            senderId: lastMessage.senderId,
            senderName: lastMessage.sender.name,
            senderRole:
              lastMessage.sender.vendorMemberships &&
              lastMessage.sender.vendorMemberships.length > 0
                ? `VENDOR_${lastMessage.sender.vendorMemberships[0].role}`
                : lastMessage.sender.role,
            senderTitle: lastMessage.sender.title,
            createdAt: lastMessage.createdAt,
          }
        : null,
      myLastReadAt: myParticipant?.lastReadAt ?? null,
      totalMessages: conversation._count?.messages ?? 0,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }
}
