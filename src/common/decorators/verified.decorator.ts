import { applyDecorators, UseGuards } from '@nestjs/common';
import { VerifiedGuard } from '../guards/verified.guard';

export function Verified() {
  return applyDecorators(UseGuards(VerifiedGuard));
}
