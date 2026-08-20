import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { AuditLogErrors } from 'src/common/constants/response.constants';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { Role, Permission, Prisma, VendorMemberRole } from '@prisma/client';
import { JwtAccessPayload } from 'src/common/interfaces/jwt-payload.interface';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: QueryAuditLogsDto, user: JwtAccessPayload) {
    const { page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    // Role-based filtering
    if (user.role === Role.VENDOR_MEMBER) {
      const membership = await this.prisma.vendorMember.findFirst({
        where: { userId: user.sub },
      });
      if (!membership) {
        throw new ForbiddenException(AuditLogErrors.VENDOR_MEMBER_NO_VENDOR);
      }
      if (membership.role === VendorMemberRole.STAFF) {
        throw new ForbiddenException(AuditLogErrors.ROLE_NOT_AUTHORIZED);
      }
      where.vendorId = membership.vendorId;
    } else if (user.role === Role.ADMIN) {
      const adminUser = await this.prisma.user.findUnique({
        where: { id: user.sub },
        select: { permissions: true },
      });
      if (!adminUser?.permissions.includes(Permission.VIEW_AUDIT_LOGS)) {
        throw new ForbiddenException(AuditLogErrors.ADMIN_REQUIRES_PERMISSION);
      }
      if (dto.vendorId) where.vendorId = dto.vendorId;
    } else if (user.role === Role.SUPER_ADMIN) {
      if (dto.vendorId) where.vendorId = dto.vendorId;
    } else {
      throw new ForbiddenException(AuditLogErrors.ROLE_NOT_AUTHORIZED);
    }

    // Apply other filters
    if (dto.userId) where.userId = dto.userId;
    if (dto.entityType) where.entityType = dto.entityType;
    if (dto.entityId) where.entityId = dto.entityId;
    if (dto.actionType) where.actionType = dto.actionType;

    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          vendor: {
            select: { id: true, storeName: true },
          },
          session: {
            select: { id: true, ipAddress: true, userAgent: true },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
