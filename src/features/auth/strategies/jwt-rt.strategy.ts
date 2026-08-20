import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthErrors } from '../../../common/constants/response.constants';
import { ConfigService } from '@nestjs/config';
import { JwtRefreshPayload } from '../../../common/interfaces/jwt-payload.interface';

@Injectable()
export class JwtRtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(
    req: Request,
    payload: JwtRefreshPayload,
  ): {
    payload: JwtRefreshPayload;
    rawRefreshToken: string;
  } {
    const authHeader = req.get('Authorization');
    if (!authHeader) {
      throw new UnauthorizedException(AuthErrors.MISSING_HEADER);
    }

    const rawRefreshToken = authHeader.replace('Bearer', '').trim();

    return { payload, rawRefreshToken };
  }
}
