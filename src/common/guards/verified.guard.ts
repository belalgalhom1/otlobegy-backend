import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UNVERIFIED_ALLOWED_KEY } from '../decorators/unverified-allowed.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtAccessPayload } from '../interfaces/jwt-payload.interface';
import { AuthErrors } from '../constants/response.constants';

@Injectable()
export class VerifiedGuard implements CanActivate {
  private readonly logger = new Logger(VerifiedGuard.name);
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const isUnverifiedAllowed = this.reflector.getAllAndOverride<boolean>(
      UNVERIFIED_ALLOWED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isUnverifiedAllowed) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: JwtAccessPayload }>();
    const user = request.user;

    if (!user?.sub) {
      throw new UnauthorizedException(AuthErrors.USER_NOT_FOUND);
    }

    if (!user.verified) {
      throw new ForbiddenException(AuthErrors.UNVERIFIED);
    }

    return true;
  }
}
