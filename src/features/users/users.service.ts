import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import {
  UpdateNotificationSettingsDto,
  ChangePasswordDto,
  UpdateUserDto,
  QueryUsersDto,
  AdminUpdateUserDto,
  BanUserDto,
} from './dto/user.dto';
import {
  CommonSuccess,
  UserErrors,
  AuthErrors,
} from 'src/common/constants/response.constants';
import { Role, VendorMemberRole, Prisma } from '@prisma/client';
import type { JwtAccessPayload } from 'src/common/interfaces/jwt-payload.interface';

// Fields returned for both self-service and admin reads (no password)
const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  title: true,
  titleAr: true,
  permissions: true,
  avatar: true,
  language: true,
  isEmailVerified: true,
  isPhoneVerified: true,
  isBanned: true,
  banReason: true,
  autoReplyMessage: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // SELF-SERVICE (existing — unchanged)
  // ═══════════════════════════════════════════════════════════════════════════

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        language: true,
        title: true,
        titleAr: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        autoReplyMessage: true,
        createdAt: true,
        notificationSettings: true,
      },
    });

    if (!user) throw new NotFoundException(UserErrors.USER_NOT_FOUND);
    return user;
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    });
    if (!user) throw new NotFoundException(UserErrors.USER_NOT_FOUND);

    const emailChanged = dto.email && dto.email !== user.email;
    const phoneChanged = dto.phone && dto.phone !== user.phone;

    if (emailChanged) {
      const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existingEmail && existingEmail.id !== userId) {
        throw new ConflictException(UserErrors.EMAIL_ALREADY_EXISTS);
      }
    }

    if (phoneChanged) {
      const existingPhone = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (existingPhone && existingPhone.id !== userId) {
        throw new ConflictException(UserErrors.PHONE_ALREADY_EXISTS);
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
        ...(emailChanged && { isEmailVerified: false }),
        ...(phoneChanged && { isPhoneVerified: false }),
      },
      select: {
        id: true,
        name: true,
        language: true,
        avatar: true,
        email: true,
        phone: true,
        title: true,
        titleAr: true,
        autoReplyMessage: true,
      },
    });

    return updated;
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });
    if (!user) throw new NotFoundException(UserErrors.USER_NOT_FOUND);

    if (user.avatar) {
      await this.storage.delete(user.avatar);
    }

    const avatarUrl = await this.storage.upload(file, 'avatars');

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });

    return { avatar: avatarUrl, message: CommonSuccess.RESOURCE_UPDATED };
  }

  async changePassword(
    userId: string,
    sessionId: string,
    dto: ChangePasswordDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    if (!user) throw new NotFoundException(UserErrors.USER_NOT_FOUND);

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) throw new UnauthorizedException(UserErrors.INVALID_PASSWORD);

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(UserErrors.PASSWORD_SAME_AS_OLD);
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { password: hashed },
      }),
      this.prisma.session.deleteMany({
        where: { userId, id: { not: sessionId } },
      }),
    ]);

    return { message: CommonSuccess.OPERATION_SUCCESS };
  }

  async getNotificationSettings(userId: string) {
    const settings = await this.prisma.notificationSetting.findUnique({
      where: { userId },
    });

    if (!settings) {
      return {
        pushEnabled: true,
        orderUpdates: true,
        chatMessages: true,
        promotions: true,
        system: true,
      };
    }

    return settings;
  }

  async updateNotificationSettings(
    userId: string,
    dto: UpdateNotificationSettingsDto,
  ) {
    const settings = await this.prisma.notificationSetting.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: { ...dto },
    });

    return settings;
  }

  async deleteAccount(userId: string) {
    await this.prisma.$transaction(async (tx) => {
      const memberships = await tx.vendorMember.findMany({ where: { userId } });
      for (const membership of memberships) {
        if (membership.role === VendorMemberRole.OWNER) {
          await tx.$executeRaw`SELECT 1 FROM vendors WHERE id = ${membership.vendorId} FOR UPDATE`;
          const ownerCount = await tx.vendorMember.count({
            where: {
              vendorId: membership.vendorId,
              role: VendorMemberRole.OWNER,
            },
          });
          if (ownerCount <= 1) {
            throw new BadRequestException(UserErrors.LAST_OWNER_OF_VENDOR);
          }
        }
      }

      await tx.session.deleteMany({ where: { userId } });
      await tx.device.deleteMany({ where: { userId } });
      await tx.user.update({
        where: { id: userId },
        data: { deletedAt: new Date(), email: null, phone: null },
      });
    });

    return { message: CommonSuccess.OPERATION_SUCCESS };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN — User Management  (MANAGE_USERS permission, enforced at route level)
  // ═══════════════════════════════════════════════════════════════════════════

  async adminFindAll(actor: JwtAccessPayload, dto: QueryUsersDto) {
    const { page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (!dto.includeDeleted) where.deletedAt = null;

    if (dto.role !== undefined) {
      where.role = dto.role;
    }

    if (dto.isBanned !== undefined) where.isBanned = dto.isBanned;
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { email: { contains: dto.search, mode: 'insensitive' } },
        { phone: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          ...USER_SELECT,
          vendorMemberships: {
            include: {
              vendor: { select: { id: true, storeName: true, logo: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async adminFindOne(actor: JwtAccessPayload, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...USER_SELECT,
        // Last 10 sessions for this user
        sessions: {
          select: {
            id: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
            expiresAt: true,
          },
          orderBy: { createdAt: 'desc' as const },
          take: 10,
        },
        // Registered push devices
        devices: {
          select: { id: true, platform: true, lastActive: true },
        },
        // Vendor memberships (if VENDOR_MEMBER)
        vendorMemberships: {
          select: {
            id: true,
            role: true,
            vendor: { select: { id: true, storeName: true, logo: true } },
          },
        },
        // Customer profile snapshot (if CUSTOMER)
        customer: {
          select: {
            id: true,
            canOrder: true,
            createdAt: true,
            deletedAt: true,
            _count: { select: { orders: true, addresses: true } },
          },
        },
        // Driver profile snapshot (if DRIVER)
        driver: {
          select: {
            id: true,
            status: true,
            vehicleType: true,
            rating: true,
            totalOrders: true,
            walletBalance: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException(UserErrors.USER_NOT_FOUND);

    return user;
  }

  async adminUpdate(
    actor: JwtAccessPayload,
    userId: string,
    dto: AdminUpdateUserDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException(UserErrors.USER_NOT_FOUND);

    if (actor.role === Role.ADMIN) {
      if (user.role === Role.SUPER_ADMIN) {
        throw new ForbiddenException(UserErrors.CANNOT_MODIFY_SUPER_ADMIN);
      }
      if (dto.role !== undefined && dto.role === Role.SUPER_ADMIN) {
        throw new ForbiddenException(UserErrors.CANNOT_CREATE_SUPER_ADMIN);
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: userId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.language !== undefined && { language: dto.language }),
          ...(dto.role !== undefined && { role: dto.role }),
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.titleAr !== undefined && { titleAr: dto.titleAr }),
          ...(dto.permissions !== undefined && {
            permissions: dto.permissions,
          }),
          ...(dto.isEmailVerified !== undefined && {
            isEmailVerified: dto.isEmailVerified,
          }),
          ...(dto.isPhoneVerified !== undefined && {
            isPhoneVerified: dto.isPhoneVerified,
          }),
          ...(dto.password !== undefined && {
            password: await bcrypt.hash(dto.password, 10),
          }),
          ...(dto.autoReplyMessage !== undefined && {
            autoReplyMessage: dto.autoReplyMessage,
          }),
        },
        select: USER_SELECT,
      });

      const newRole = dto.role ?? u.role;
      if (newRole !== Role.VENDOR_MEMBER || dto.vendorId) {
        const memberships = await tx.vendorMember.findMany({
          where: { userId },
        });

        for (const membership of memberships) {
          if (membership.role === VendorMemberRole.OWNER) {
            await tx.$executeRaw`SELECT 1 FROM vendors WHERE id = ${membership.vendorId} FOR UPDATE`;
            const ownerCount = await tx.vendorMember.count({
              where: {
                vendorId: membership.vendorId,
                role: VendorMemberRole.OWNER,
              },
            });

            const isStayingOwner =
              newRole === Role.VENDOR_MEMBER &&
              dto.vendorId === membership.vendorId &&
              dto.vendorRole === VendorMemberRole.OWNER;
            if (ownerCount <= 1 && !isStayingOwner) {
              throw new BadRequestException(UserErrors.LAST_OWNER_OF_VENDOR);
            }
          }
        }
      }

      if (newRole !== Role.VENDOR_MEMBER) {
        await tx.vendorMember.deleteMany({
          where: { userId },
        });
      } else {
        if (dto.vendorId) {
          await tx.vendorMember.deleteMany({
            where: { userId },
          });
          await tx.vendorMember.create({
            data: {
              userId,
              vendorId: dto.vendorId,
              role:
                (dto.vendorRole as VendorMemberRole) ?? VendorMemberRole.STAFF,
            },
          });
        }
      }

      return u;
    });

    this.logger.log(`Admin updated user ${userId}`);
    return updated;
  }

  async adminBan(actor: JwtAccessPayload, userId: string, dto: BanUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException(UserErrors.USER_NOT_FOUND);

    if (user.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException(UserErrors.CANNOT_BAN_SUPER_ADMIN);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Immediately invalidate all active sessions
      await tx.session.deleteMany({ where: { userId } });
      return tx.user.update({
        where: { id: userId },
        data: { isBanned: true, banReason: dto.reason ?? null },
        select: USER_SELECT,
      });
    });

    this.logger.log(
      `Admin banned user ${userId}: ${dto.reason ?? 'no reason'}`,
    );
    return updated;
  }

  async adminUnban(actor: JwtAccessPayload, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException(UserErrors.USER_NOT_FOUND);

    if (actor.role === Role.ADMIN && user.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException(UserErrors.CANNOT_MODIFY_SUPER_ADMIN);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isBanned: false, banReason: null },
      select: USER_SELECT,
    });

    this.logger.log(`Admin unbanned user ${userId}`);
    return updated;
  }

  async adminGetSessions(actor: JwtAccessPayload, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException(UserErrors.USER_NOT_FOUND);

    return this.prisma.session.findMany({
      where: { userId },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminRevokeAllSessions(actor: JwtAccessPayload, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException(UserErrors.USER_NOT_FOUND);

    if (actor.role === Role.ADMIN && user.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException(UserErrors.CANNOT_MODIFY_SUPER_ADMIN);
    }

    const { count } = await this.prisma.session.deleteMany({
      where: { userId },
    });

    this.logger.log(`Admin revoked ${count} sessions for user ${userId}`);
    return { revoked: count, message: CommonSuccess.OPERATION_SUCCESS };
  }

  async adminRemove(actor: JwtAccessPayload, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException(UserErrors.USER_NOT_FOUND);

    if (user.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException(UserErrors.CANNOT_DELETE_SUPER_ADMIN);
    }

    await this.prisma.$transaction(async (tx) => {
      const memberships = await tx.vendorMember.findMany({ where: { userId } });
      for (const membership of memberships) {
        if (membership.role === VendorMemberRole.OWNER) {
          await tx.$executeRaw`SELECT 1 FROM vendors WHERE id = ${membership.vendorId} FOR UPDATE`;
          const ownerCount = await tx.vendorMember.count({
            where: {
              vendorId: membership.vendorId,
              role: VendorMemberRole.OWNER,
            },
          });
          if (ownerCount <= 1) {
            throw new BadRequestException(UserErrors.LAST_OWNER_OF_VENDOR);
          }
        }
      }

      await tx.session.deleteMany({ where: { userId } });
      await tx.device.deleteMany({ where: { userId } });
      await tx.user.update({
        where: { id: userId },
        data: { deletedAt: new Date(), email: null, phone: null },
      });
    });

    this.logger.log(`Admin soft-deleted user ${userId}`);
    return { message: CommonSuccess.RESOURCE_DELETED };
  }
}
