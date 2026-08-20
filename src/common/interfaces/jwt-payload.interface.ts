import { Role } from '@prisma/client';

export interface JwtAccessPayload {
  sub: string;
  sid: string;
  role: Role;
  verified: boolean;
}

export interface JwtRefreshPayload {
  sub: string;
  sid: string;
}
