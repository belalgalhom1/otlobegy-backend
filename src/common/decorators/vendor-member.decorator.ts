import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { VendorMemberRole } from '@prisma/client';
import { VendorMemberGuard } from '../guards/vendor-member.guard';

export const VENDOR_MEMBER_ROLES_KEY = 'vendorMemberRoles';
export const VENDOR_ID_PARAM_KEY = 'vendorIdParam';

export interface VendorMemberOptions {
  /**
   * Which VendorMemberRole values are permitted.
   * Omit (or pass an empty array) to allow any member regardless of their role.
   *
   * Examples:
   *   @VendorMember()                              — any member of the vendor
   *   @VendorMember({ roles: ['OWNER'] })          — owner only
   *   @VendorMember({ roles: ['OWNER','MANAGER']}) — owner or manager
   */
  roles?: VendorMemberRole[];

  /**
   * Name of the route param that carries the vendor id.
   * Defaults to 'vendorId'.
   *
   * Example: @Param('id') → pass { vendorIdParam: 'id' }
   */
  vendorIdParam?: string;
}

export const VendorMember = (options: VendorMemberOptions = {}) =>
  applyDecorators(
    SetMetadata(VENDOR_MEMBER_ROLES_KEY, options.roles ?? []),
    SetMetadata(VENDOR_ID_PARAM_KEY, options.vendorIdParam ?? 'vendorId'),
    UseGuards(VendorMemberGuard),
  );
