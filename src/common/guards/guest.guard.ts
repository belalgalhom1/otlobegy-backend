import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JWT_ACCESS_SERVICE } from 'src/common/constants/jwt.constants';

@Injectable()
export class GuestGuard implements CanActivate {
  private readonly logger = new Logger(GuestGuard.name);
  constructor(
    @Inject(JWT_ACCESS_SERVICE) private accessTokenService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) return true;

    try {
      await this.accessTokenService.verifyAsync(token);
      throw new ForbiddenException();
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      return true;
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer') return undefined;

    return token;
  }
}
