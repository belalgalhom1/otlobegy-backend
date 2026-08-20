import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { JwtAccessPayload } from '../../../common/interfaces/jwt-payload.interface';
import { AuthErrors } from '../../../common/constants/response.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtAccessPayload): Promise<JwtAccessPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        isBanned: true,
        banReason: true,
        isEmailVerified: true,
      },
    });

    if (!user) throw new UnauthorizedException(AuthErrors.USER_NOT_FOUND);

    if (user.isBanned) {
      throw new UnauthorizedException(
        user.banReason
          ? `${AuthErrors.BANNED}: ${user.banReason}`
          : AuthErrors.BANNED,
      );
    }

    return {
      sub: user.id,
      sid: payload.sid,
      role: user.role,
      verified: user.isEmailVerified,
    };
  }
}
