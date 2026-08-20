import { SetMetadata } from '@nestjs/common';

export const UNVERIFIED_ALLOWED_KEY = 'unverifiedAllowed';
export const UnverifiedAllowed = () =>
  SetMetadata(UNVERIFIED_ALLOWED_KEY, true);
