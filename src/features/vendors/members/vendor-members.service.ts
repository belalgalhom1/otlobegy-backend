import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  AddVendorMemberDto,
  UpdateVendorMemberRoleDto,
} from './dto/vendor-member.dto';
import {
  VendorMemberErrors,
  VendorErrors,
} from 'src/common/constants/response.constants';
import { CommonSuccess } from '../../../common/constants/response.constants';
import { VendorMemberRole } from '@prisma/client';

@Injectable()
export class VendorMembersService {
  private readonly logger = new Logger(VendorMembersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── List all members of a vendor ─────────────────────────────────────────

  async findAll(vendorId: string) {
    await this.assertVendorExists(vendorId);

    return this.prisma.vendorMember.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            title: true,
            titleAr: true,
          },
        },
      },
    });
  }

  // ─── Add a new member ─────────────────────────────────────────────────────
  // Only OWNER (or admin with MANAGE_VENDORS) may add members.
  // The guard enforces the OWNER restriction at the route level;
  // this service just handles the business logic.

  async addMember(vendorId: string, dto: AddVendorMemberDto) {
    await this.assertVendorExists(vendorId);

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException(VendorMemberErrors.USER_NOT_FOUND);

    if (dto.branchId) {
      const branch = await this.prisma.vendorBranch.findFirst({
        where: { id: dto.branchId, vendorId },
        select: { id: true },
      });
      if (!branch)
        throw new BadRequestException(VendorMemberErrors.BRANCH_NOT_FOUND);
    }

    const existing = await this.prisma.vendorMember.findUnique({
      where: { vendorId_userId: { vendorId, userId: dto.userId } },
    });
    if (existing)
      throw new ConflictException(VendorMemberErrors.ALREADY_MEMBER);

    const member = await this.prisma.vendorMember.create({
      data: {
        vendorId,
        userId: dto.userId,
        role: dto.role,
        branchId: dto.branchId ?? null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    this.logger.log(
      `Member added to vendor ${vendorId}: user ${dto.userId} as ${dto.role}`,
    );

    return member;
  }

  // ─── Update a member's role ───────────────────────────────────────────────

  async updateRole(
    vendorId: string,
    memberId: string,
    dto: UpdateVendorMemberRoleDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Lock vendor to prevent concurrent modifications
      await tx.$executeRaw`SELECT 1 FROM vendors WHERE id = ${vendorId} FOR UPDATE`;

      const member = await tx.vendorMember.findFirst({
        where: { id: memberId, vendorId },
      });
      if (!member) throw new NotFoundException(VendorMemberErrors.NOT_FOUND);

      if (dto.branchId) {
        const branch = await tx.vendorBranch.findFirst({
          where: { id: dto.branchId, vendorId },
          select: { id: true },
        });
        if (!branch)
          throw new BadRequestException(VendorMemberErrors.BRANCH_NOT_FOUND);
      }

      const updated = await tx.vendorMember.update({
        where: { id: memberId },
        data: {
          role: dto.role,
          branchId: dto.branchId !== undefined ? dto.branchId : undefined,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      });

      if (
        member.role === VendorMemberRole.OWNER &&
        dto.role !== VendorMemberRole.OWNER
      ) {
        const ownerCount = await tx.vendorMember.count({
          where: { vendorId, role: VendorMemberRole.OWNER },
        });

        if (ownerCount === 0) {
          throw new BadRequestException(VendorMemberErrors.OWNER_REQUIRED);
        }
      }

      return updated;
    });
  }

  // ─── Remove a member ──────────────────────────────────────────────────────

  async removeMember(vendorId: string, memberId: string, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Lock vendor
      await tx.$executeRaw`SELECT 1 FROM vendors WHERE id = ${vendorId} FOR UPDATE`;

      const member = await tx.vendorMember.findFirst({
        where: { id: memberId, vendorId },
      });
      if (!member) throw new NotFoundException(VendorMemberErrors.NOT_FOUND);

      if (member.userId === actorUserId) {
        throw new ForbiddenException(VendorMemberErrors.CANNOT_REMOVE_SELF);
      }

      await tx.vendorMember.delete({ where: { id: memberId } });

      if (member.role === VendorMemberRole.OWNER) {
        const ownerCount = await tx.vendorMember.count({
          where: { vendorId, role: VendorMemberRole.OWNER },
        });

        if (ownerCount === 0) {
          throw new BadRequestException(VendorMemberErrors.OWNER_REQUIRED);
        }
      }

      this.logger.log(`Member ${memberId} removed from vendor ${vendorId}`);
      return { message: CommonSuccess.RESOURCE_DELETED };
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async findMember(vendorId: string, memberId: string) {
    const member = await this.prisma.vendorMember.findFirst({
      where: { id: memberId, vendorId },
    });
    if (!member) throw new NotFoundException(VendorMemberErrors.NOT_FOUND);
    return member;
  }

  private async assertVendorExists(vendorId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, deletedAt: null },
      select: { id: true },
    });
    if (!vendor) throw new NotFoundException(VendorErrors.NOT_FOUND);
  }
}
