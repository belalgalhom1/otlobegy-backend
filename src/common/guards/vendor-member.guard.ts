import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, Role, VendorMemberRole } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  VendorErrors,
  VendorMemberErrors,
} from '../constants/response.constants';
import { JwtAccessPayload } from '../interfaces/jwt-payload.interface';
import {
  VENDOR_MEMBER_ROLES_KEY,
  VENDOR_ID_PARAM_KEY,
} from '../decorators/vendor-member.decorator';

@Injectable()
export class VendorMemberGuard implements CanActivate {
  private readonly logger = new Logger(VendorMemberGuard.name);
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: JwtAccessPayload;
      params: Record<string, string>;
    }>();

    const user = request.user;
    if (!user?.sub) throw new UnauthorizedException();

    // SUPER_ADMIN always has full access across all vendors.
    if (user.role === Role.SUPER_ADMIN) return true;

    // ADMIN users with the MANAGE_VENDORS permission have full access across
    // all vendors without needing to be a member of any specific one.
    if (user.role === Role.ADMIN) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.sub },
        select: { permissions: true },
      });

      if (dbUser?.permissions.includes(Permission.MANAGE_VENDORS)) return true;
    }

    // Resolve which route param holds the vendor id.
    const vendorIdParam =
      this.reflector.getAllAndOverride<string>(VENDOR_ID_PARAM_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'vendorId';

    const vendorId = request.params[vendorIdParam];

    if (!vendorId) {
      // Guard is misconfigured — the param name doesn't match the route.
      throw new ForbiddenException(
        `VendorMemberGuard: route param "${vendorIdParam}" not found`,
      );
    }

    // Check if the vendor exists and fetch the user's membership in a single query
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        members: {
          where: { userId: user.sub },
          select: { role: true, branchId: true },
        },
      },
    });

    if (!vendor) throw new NotFoundException(VendorErrors.NOT_FOUND);

    if (!vendor.members || vendor.members.length === 0) {
      throw new ForbiddenException(VendorMemberErrors.NOT_A_MEMBER);
    }

    const membership = vendor.members[0];

    const requiredRoles =
      this.reflector.getAllAndOverride<VendorMemberRole[]>(
        VENDOR_MEMBER_ROLES_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (requiredRoles.length > 0 && !requiredRoles.includes(membership.role)) {
      throw new ForbiddenException(
        `This action requires one of the following vendor roles: ${requiredRoles.join(', ')}`,
      );
    }

    (
      request as unknown as { vendorMemberRole?: VendorMemberRole }
    ).vendorMemberRole = membership.role;

    (
      request as unknown as { vendorMemberBranchId?: string | null }
    ).vendorMemberBranchId = membership.branchId;

    return true;
  }
}
