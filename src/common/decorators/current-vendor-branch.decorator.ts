import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the resolved VendorMemberBranchId that VendorMemberGuard attached
 * to the request. This represents the branch the manager is restricted to.
 * Returns null if they are a global manager or owner.
 *
 * Only valid on routes protected by @VendorMember().
 */
export const CurrentVendorBranch = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ vendorMemberBranchId?: string | null }>();
    return request.vendorMemberBranchId;
  },
);
