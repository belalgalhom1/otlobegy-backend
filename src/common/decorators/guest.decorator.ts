import { applyDecorators, UseGuards } from '@nestjs/common';
import { Public } from './public.decorator';
import { GuestGuard } from '../guards/guest.guard';

export function Guest() {
  return applyDecorators(Public(), UseGuards(GuestGuard));
}
