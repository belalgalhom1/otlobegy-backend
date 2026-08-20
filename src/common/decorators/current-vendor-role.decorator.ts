import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { VendorMemberRole } from '@prisma/client';

/**
 * Extracts the resolved VendorMemberRole that VendorMemberGuard attached
 * to the request, so controllers don't need an extra DB call.
 *
 * Only valid on routes protected by @VendorMember().
 *
 * @example
 * @Get('dashboard')
 * @VendorMember()
 * getDashboard(
 *   @CurrentVendorRole() memberRole: VendorMemberRole,
 * ) { ... }
 */
export const CurrentVendorRole = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): VendorMemberRole | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ vendorMemberRole?: VendorMemberRole }>();
    return request.vendorMemberRole;
  },
);
