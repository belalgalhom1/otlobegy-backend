import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { JwtAccessPayload } from '../interfaces/jwt-payload.interface';
import { Role } from '@prisma/client';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: JwtAccessPayload }>();

    const user = request.user;
    if (!user?.sub) throw new UnauthorizedException();

    if (user.role === Role.SUPER_ADMIN) return true;

    if (user.role === Role.ADMIN) {
      const adminUser = await this.prisma.user.findUnique({
        where: { id: user.sub },
        select: { permissions: true },
      });

      if (!adminUser) throw new UnauthorizedException();

      const hasAll = requiredPermissions.every((p) =>
        adminUser.permissions.includes(p),
      );

      if (!hasAll) throw new ForbiddenException();

      return true;
    }

    throw new ForbiddenException();
  }
}
