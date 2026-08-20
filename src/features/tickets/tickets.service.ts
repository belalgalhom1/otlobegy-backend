import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { JwtAccessPayload } from 'src/common/interfaces/jwt-payload.interface';
import {
  CreateTicketDto,
  UpdateTicketDto,
  QueryTicketsDto,
} from './dto/ticket.dto';
import {
  ConversationStatus,
  ConversationType,
  Role,
  TicketStatus,
  Permission,
  Prisma,
} from '@prisma/client';
import { TicketErrors } from 'src/common/constants/response.constants';
import { TicketStatusUpdatedEvent } from 'src/common/events';
import { EVENTS } from 'src/common/events/event-names';
import {
  QUEUES,
  TICKET_JOBS,
} from '../../infrastructure/queue/queues.constants';
import { MessagesService } from '../chat/messages.service';

const CREATOR_ROLES = new Set<Role>([
  Role.CUSTOMER,
  Role.DRIVER,
  Role.VENDOR_MEMBER,
]);

@Injectable()
export class TicketsService implements OnModuleInit {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue(QUEUES.TICKETS) private readonly ticketsQueue: Queue,
    private readonly messagesService: MessagesService,
  ) {}

  async onModuleInit() {
    // Ticket SLA Watchdog is scheduled by TicketsProcessor
  }

  private async canManageTickets(
    actorId: string,
    actorRole: Role,
  ): Promise<boolean> {
    if (actorRole === Role.SUPER_ADMIN) return true;

    const user = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { permissions: true },
    });

    return !!user?.permissions.includes(Permission.MANAGE_TICKETS);
  }

  async create(actor: JwtAccessPayload, dto: CreateTicketDto) {
    if (
      !CREATOR_ROLES.has(actor.role) &&
      !(await this.canManageTickets(actor.sub, actor.role))
    ) {
      throw new ForbiddenException(TicketErrors.CANNOT_CREATE);
    }

    if (dto.orderId) {
      await this.assertOrderExists(dto.orderId);
      if (!dto.vendorId) {
        const order = await this.prisma.order.findUnique({
          where: { id: dto.orderId },
          select: { vendorId: true },
        });
        if (order) {
          dto.vendorId = order.vendorId ?? undefined;
        }
      }
    }
    if (dto.vendorId) await this.assertVendorExists(dto.vendorId);

    const activeTicket = await this.prisma.supportTicket.findFirst({
      where: {
        creatorId: actor.sub,
        status: { notIn: [TicketStatus.CLOSED, TicketStatus.RESOLVED] },
      },
    });

    if (activeTicket) {
      throw new BadRequestException(TicketErrors.ACTIVE_TICKET_EXISTS);
    }

    // Determine the assignee depending on the category of the ticket
    let assigneeId: string | null = null;

    if (dto.category === 'VENDOR') {
      if (dto.vendorId) {
        const members = await this.prisma.vendorMember.findMany({
          where: { vendorId: dto.vendorId },
          select: { userId: true },
        });
        if (members.length > 0) {
          const randomIndex = Math.floor(Math.random() * members.length);
          assigneeId = members[randomIndex].userId;
        }
      }
    } else if (dto.category === 'DELIVERY') {
      if (dto.orderId) {
        const order = await this.prisma.order.findUnique({
          where: { id: dto.orderId },
          select: { driverId: true },
        });
        if (order?.driverId) {
          const driver = await this.prisma.driver.findUnique({
            where: { id: order.driverId },
            select: { userId: true },
          });
          if (driver) {
            assigneeId = driver.userId;
          }
        }
      }
      if (!assigneeId) {
        const supervisor = await this.prisma.user.findFirst({
          where: { role: Role.ADMIN },
          select: { id: true },
        });
        if (supervisor) {
          assigneeId = supervisor.id;
        }
      }
    } else if (dto.category === 'PAYMENT') {
      const supervisor = await this.prisma.user.findFirst({
        where: { role: Role.SUPER_ADMIN },
        select: { id: true },
      });
      if (supervisor) {
        assigneeId = supervisor.id;
      }
    } else if (dto.category === 'ACCOUNT') {
      const supervisor = await this.prisma.user.findFirst({
        where: { role: Role.SUPER_ADMIN },
        select: { id: true },
      });
      if (supervisor) {
        assigneeId = supervisor.id;
      }
    } else if (dto.category === 'RETURN_COMPLAINT') {
      const supervisor = await this.prisma.user.findFirst({
        where: { role: Role.SUPER_ADMIN },
        select: { id: true },
      });
      if (supervisor) {
        assigneeId = supervisor.id;
      }
    }

    // Fallback: If no specific supervisor was assigned for the category
    if (!assigneeId) {
      const supervisor = await this.prisma.user.findFirst({
        where: { role: Role.SUPER_ADMIN },
        select: { id: true },
      });
      if (supervisor) {
        assigneeId = supervisor.id;
      }
    }

    const ticketNumber = await this.generateTicketNumber();

    const ticket = await this.prisma.$transaction(async (tx) => {
      const created = await tx.supportTicket.create({
        data: {
          ticketNumber,
          subject: dto.subject,
          description: dto.description ?? null,
          category: dto.category,
          subCategory: dto.subCategory,
          priority: dto.priority,
          status: TicketStatus.OPEN,
          creatorId: actor.sub,
          assigneeId: assigneeId,
          orderId: dto.orderId ?? null,
          vendorId: dto.vendorId ?? null,
          metadata: dto.metadata ?? Prisma.DbNull,
          lastStatusUpdateAt: new Date(),
        },
      });

      const conversation = await tx.conversation.create({
        data: {
          type: ConversationType.SUPPORT,
          status: ConversationStatus.OPEN,
          vendorId: dto.vendorId ?? null,
          participants: {
            create: [
              { userId: actor.sub },
              ...(assigneeId ? [{ userId: assigneeId }] : []),
            ],
          },
        },
      });

      const updated = await tx.supportTicket.update({
        where: { id: created.id },
        data: { conversationId: conversation.id },
        include: this.ticketIncludes(),
      });

      return updated;
    });

    // Send auto-reply welcome message if configured by the assignee
    if (assigneeId && ticket.conversationId) {
      const assigneeUser = await this.prisma.user.findUnique({
        where: { id: assigneeId },
        select: { autoReplyMessage: true },
      });
      if (assigneeUser?.autoReplyMessage) {
        const creatorUser = await this.prisma.user.findUnique({
          where: { id: actor.sub },
          select: { name: true },
        });
        const customerName = creatorUser?.name ?? 'Customer';
        const welcomeMessage = assigneeUser.autoReplyMessage
          .replace(/\[customer name\]/gi, customerName)
          .replace(/\{customerName\}/gi, customerName)
          .replace(/\[customer_name\]/gi, customerName)
          .replace(/\{name\}/gi, customerName)
          .replace(/\[name\]/gi, customerName);

        await this.messagesService.sendAutoReply(
          assigneeId,
          ticket.conversationId,
          welcomeMessage,
        );
      }
    }

    this.logger.log(
      `Ticket created: ${ticket.ticketNumber} by user ${actor.sub} (assigned to ${assigneeId ?? 'none'})`,
    );
    return this.formatTicket(ticket);
  }

  async list(actor: JwtAccessPayload, dto: QueryTicketsDto) {
    const { page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.SupportTicketWhereInput = {};

    if (actor.role === Role.SUPER_ADMIN) {
      if (dto.creatorId) where.creatorId = dto.creatorId;
      if (dto.assigneeId) where.assigneeId = dto.assigneeId;
    } else if (actor.role === Role.ADMIN) {
      where.OR = [
        { category: 'DELIVERY' },
        { creatorId: actor.sub },
        { assigneeId: actor.sub },
      ];
      if (dto.creatorId) where.creatorId = dto.creatorId;
      if (dto.assigneeId) where.assigneeId = dto.assigneeId;
    } else if (actor.role === Role.VENDOR_MEMBER) {
      const membership = await this.prisma.vendorMember.findFirst({
        where: { userId: actor.sub },
        select: { vendorId: true },
      });
      const vendorId = membership?.vendorId ?? 'NONE';
      where.OR = [{ category: 'VENDOR', vendorId }, { creatorId: actor.sub }];
    } else {
      where.creatorId = actor.sub;
    }

    if (dto.status) where.status = dto.status;
    if (dto.priority) where.priority = dto.priority;
    if (dto.category) where.category = dto.category;

    const [tickets, total, counts] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: this.ticketIncludes(),
      }),
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.groupBy({
        by: ['status'],
        _count: { status: true },
        where: where,
      }),
    ]);

    const statusCounts = counts.reduce(
      (acc, curr) => {
        acc[curr.status] = curr._count.status;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      tickets: tickets.map((t) => this.formatTicket(t)),
      total,
      counts: statusCounts,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOne(actor: JwtAccessPayload, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: this.ticketIncludes(),
    });

    if (!ticket) throw new NotFoundException(TicketErrors.NOT_FOUND);

    await this.assertAccess(actor, ticket);
    return this.formatTicket(ticket);
  }

  async update(
    actor: JwtAccessPayload,
    ticketId: string,
    dto: UpdateTicketDto,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) throw new NotFoundException(TicketErrors.NOT_FOUND);

    await this.assertAccess(actor, ticket);

    const isCreator = ticket.creatorId === actor.sub;
    const isManager =
      actor.role === Role.SUPER_ADMIN ||
      actor.role === Role.ADMIN ||
      actor.role === Role.VENDOR_MEMBER;

    if (!isManager && !isCreator) {
      throw new ForbiddenException(TicketErrors.CANNOT_UPDATE);
    }

    if (!isManager) {
      const allowedKeys = new Set(['status']);
      const attemptedKeys = Object.keys(dto).filter(
        (k) => dto[k as keyof UpdateTicketDto] !== undefined,
      );

      if (attemptedKeys.some((k) => !allowedKeys.has(k))) {
        throw new ForbiddenException(TicketErrors.CANNOT_UPDATE);
      }

      if (dto.status && dto.status !== TicketStatus.CLOSED) {
        throw new ForbiddenException(TicketErrors.CANNOT_UPDATE);
      }
    }

    let targetVendorId = dto.vendorId;
    if (dto.category === 'VENDOR' && !targetVendorId && ticket.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: ticket.orderId },
        select: { vendorId: true },
      });
      if (order) {
        targetVendorId = order.vendorId ?? undefined;
      }
    }

    if (dto.assigneeId) {
      await this.assertAssigneeCanManage(dto.assigneeId);
    }
    if (targetVendorId) {
      await this.assertVendorExists(targetVendorId);
    } else if (dto.vendorId) {
      await this.assertVendorExists(dto.vendorId);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const isTransfer =
        dto.category !== undefined && dto.category !== ticket.category;

      const result = await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          ...(dto.subject !== undefined && { subject: dto.subject }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.status !== undefined && {
            status: dto.status,
            lastStatusUpdateAt: new Date(),
          }),
          ...(dto.priority !== undefined && { priority: dto.priority }),
          ...(dto.category !== undefined && { category: dto.category }),
          ...(dto.category === 'VENDOR'
            ? { vendorId: targetVendorId ?? null, assigneeId: null }
            : {
                ...(dto.category !== undefined
                  ? { vendorId: null }
                  : dto.vendorId !== undefined && { vendorId: dto.vendorId }),
                ...(isTransfer
                  ? { assigneeId: null }
                  : dto.assigneeId !== undefined && {
                      assigneeId: dto.assigneeId,
                    }),
              }),
          ...(dto.subCategory !== undefined && {
            subCategory: dto.subCategory,
          }),
          ...(dto.metadata !== undefined && { metadata: dto.metadata }),
        },
        include: this.ticketIncludes(),
      });

      if (result.conversationId) {
        const resolvedVendorId =
          dto.category === 'VENDOR'
            ? (targetVendorId ?? result.vendorId)
            : dto.category !== undefined
              ? null
              : dto.vendorId !== undefined
                ? dto.vendorId
                : result.vendorId;

        await tx.conversation.update({
          where: { id: result.conversationId },
          data: { vendorId: resolvedVendorId },
        });

        if (isTransfer) {
          await tx.conversationParticipant.deleteMany({
            where: {
              conversationId: result.conversationId,
              userId: actor.sub,
            },
          });
        }
      }

      if (dto.assigneeId && !isTransfer && result.conversationId) {
        const alreadyIn = await tx.conversationParticipant.findUnique({
          where: {
            conversationId_userId: {
              conversationId: result.conversationId,
              userId: dto.assigneeId,
            },
          },
        });

        if (!alreadyIn) {
          await tx.conversationParticipant.create({
            data: {
              conversationId: result.conversationId,
              userId: dto.assigneeId,
            },
          });
        }
      }

      if (
        dto.status === TicketStatus.RESOLVED ||
        dto.status === TicketStatus.CLOSED
      ) {
        if (result.conversationId) {
          await tx.conversation.update({
            where: { id: result.conversationId },
            data: { status: ConversationStatus.CLOSED },
          });
        }
      }

      return result;
    });

    if (dto.status && dto.status !== ticket.status) {
      this.eventEmitter.emit(
        EVENTS.TICKET_STATUS_UPDATED,
        new TicketStatusUpdatedEvent(
          updated.id,
          updated.ticketNumber,
          updated.status,
          updated.creatorId,
          actor.sub,
        ),
      );
    }

    this.logger.log(
      `Ticket ${ticket.ticketNumber} updated by user ${actor.sub}`,
    );
    return this.formatTicket(updated);
  }

  async remove(actor: JwtAccessPayload, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) throw new NotFoundException(TicketErrors.NOT_FOUND);

    await this.assertAccess(actor, ticket);

    const isManager =
      actor.role === Role.SUPER_ADMIN ||
      (actor.role === Role.ADMIN && ticket.category === 'DELIVERY') ||
      (actor.role === Role.VENDOR_MEMBER && ticket.category === 'VENDOR');

    if (!isManager) {
      throw new ForbiddenException(TicketErrors.CANNOT_DELETE);
    }

    await this.prisma.supportTicket.delete({ where: { id: ticketId } });

    this.logger.log(
      `Ticket ${ticket.ticketNumber} deleted by manager ${actor.sub}`,
    );
    return { deleted: true };
  }

  private async generateTicketNumber(): Promise<string> {
    const result = await this.prisma.$queryRaw<[{ nextval: bigint }]>`
      SELECT nextval('ticket_number_seq')
    `;
    const seq = Number(result[0].nextval);
    return `#A${String(seq).padStart(5, '0')}`;
  }

  private async assertOrderExists(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });
    if (!order) throw new NotFoundException(TicketErrors.ORDER_NOT_FOUND);
  }

  private async assertVendorExists(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });
    if (!vendor) throw new NotFoundException(TicketErrors.VENDOR_NOT_FOUND);
  }

  private async assertAssigneeCanManage(assigneeId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: assigneeId },
      select: { role: true, permissions: true },
    });

    if (!user)
      throw new BadRequestException(TicketErrors.ASSIGNEE_MUST_BE_ADMIN);

    const canManage =
      user.role === Role.SUPER_ADMIN ||
      user.permissions.includes(Permission.MANAGE_TICKETS);

    if (!canManage)
      throw new BadRequestException(TicketErrors.ASSIGNEE_MUST_BE_ADMIN);
  }

  private async assertAccess(
    actor: JwtAccessPayload,
    ticket: {
      creatorId: string;
      assigneeId: string | null;
      category: string;
      vendorId: string | null;
    },
  ) {
    if (actor.role === Role.SUPER_ADMIN) return;
    if (ticket.creatorId === actor.sub) return;
    if (ticket.assigneeId === actor.sub) return;

    if (actor.role === Role.ADMIN) {
      if (ticket.category === 'DELIVERY') return;
    }

    if (actor.role === Role.VENDOR_MEMBER) {
      if (ticket.category === 'VENDOR' && ticket.vendorId) {
        const membership = await this.prisma.vendorMember.findFirst({
          where: { userId: actor.sub, vendorId: ticket.vendorId },
          select: { id: true },
        });
        if (membership) return;
      }
    }

    throw new ForbiddenException(TicketErrors.CANNOT_VIEW);
  }

  private ticketIncludes() {
    return {
      creator: {
        select: { id: true, name: true, avatar: true, role: true },
      },
      assignee: {
        select: { id: true, name: true, avatar: true, role: true },
      },
      order: {
        select: { id: true, orderNumber: true, status: true },
      },
      vendor: {
        select: { id: true, storeName: true, logo: true },
      },
      conversation: {
        select: { id: true, status: true },
      },
    } as const;
  }

  private formatTicket(ticketRaw: unknown) {
    const ticket = ticketRaw as {
      id: string;
      ticketNumber: string;
      subject: string;
      description: string | null;
      status: string;
      category: string;
      subCategory: string | null;
      priority: string;
      creator: {
        id: string;
        name: string;
        avatar: string | null;
        role: string;
      };
      assignee?: {
        id: string;
        name: string;
        avatar: string | null;
        role: string;
      } | null;
      order?: { id: string; orderNumber: string; status: string } | null;
      vendor?: { id: string; storeName: string; logo: string | null } | null;
      conversationId: string | null;
      conversation?: { id: string; status: string } | null;
      metadata: Prisma.JsonValue;
      lastStatusUpdateAt: Date;
      escalatedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    };
    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      category: ticket.category,
      subCategory: ticket.subCategory,
      priority: ticket.priority,
      creator: ticket.creator,
      assignee: ticket.assignee ?? null,
      order: ticket.order ?? null,
      vendor: ticket.vendor ?? null,
      conversationId: ticket.conversationId ?? null,
      conversation: ticket.conversation ?? null,
      metadata: ticket.metadata,
      lastStatusUpdateAt: ticket.lastStatusUpdateAt,
      escalatedAt: ticket.escalatedAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }
}
