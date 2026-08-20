import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VendorMembersService } from './vendor-members.service';
import {
  AddVendorMemberDto,
  UpdateVendorMemberRoleDto,
} from './dto/vendor-member.dto';
import { VendorMember } from '../../../common/decorators/vendor-member.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Permission, VendorMemberRole } from '@prisma/client';
import type { JwtAccessPayload } from '../../../common/interfaces/jwt-payload.interface';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../../common/decorators/api-response.decorator';


@ApiTags('Vendors - Members (Team)')
@ApiBearerAuth()
@Controller('vendors/:vendorId/members')
export class VendorMembersController {
  constructor(private readonly service: VendorMembersService) {}

  // Any member of the vendor can list members.
  @ApiStandardResponse()
  @Get()
  @VendorMember()
  @ApiOperation({ summary: 'List all members of a vendor' })
  findAll(@Param('vendorId') vendorId: string) {
    return this.service.findAll(vendorId);
  }

  // Only OWNER or admin with MANAGE_VENDORS can add a member.
  @ApiStandardResponse()
  @Post()
  @VendorMember({ roles: [VendorMemberRole.OWNER] })
  @ApiOperation({ summary: 'Add a new member to the vendor' })
  addMember(
    @Param('vendorId') vendorId: string,
    @Body() dto: AddVendorMemberDto,
  ) {
    return this.service.addMember(vendorId, dto);
  }

  // Only OWNER or admin with MANAGE_VENDORS can update a member's role.
  @ApiStandardResponse()
  @Patch(':memberId/role')
  @HttpCode(HttpStatus.OK)
  @VendorMember({ roles: [VendorMemberRole.OWNER] })
  @ApiOperation({ summary: "Update a member's role" })
  updateRole(
    @Param('vendorId') vendorId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateVendorMemberRoleDto,
  ) {
    return this.service.updateRole(vendorId, memberId, dto);
  }

  // Only OWNER or admin with MANAGE_VENDORS can remove a member.
  @ApiStandardResponse()
  @Delete(':memberId')
  @HttpCode(HttpStatus.OK)
  @VendorMember({ roles: [VendorMemberRole.OWNER] })
  @ApiOperation({ summary: 'Remove a member from the vendor' })
  removeMember(
    @Param('vendorId') vendorId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() actor: JwtAccessPayload,
  ) {
    return this.service.removeMember(vendorId, memberId, actor.sub);
  }

  // ─── Admin override routes ────────────────────────────────────────────────
  // Admins with MANAGE_VENDORS can manage members of any vendor without
  // being a member themselves. The VendorMemberGuard already bypasses for
  // MANAGE_VENDORS, so we use RequirePermissions here as the sole guard
  // for explicitly admin-only endpoints.

  @ApiStandardResponse()
  @Post('admin')
  @RequirePermissions(Permission.MANAGE_VENDORS)
  @ApiOperation({ summary: 'Add a new member to a vendor (Admin Override)' })
  adminAddMember(
    @Param('vendorId') vendorId: string,
    @Body() dto: AddVendorMemberDto,
  ) {
    return this.service.addMember(vendorId, dto);
  }

  @ApiStandardResponse()
  @Delete('admin/:memberId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.MANAGE_VENDORS)
  @ApiOperation({ summary: 'Remove a member from a vendor (Admin Override)' })
  adminRemoveMember(
    @Param('vendorId') vendorId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() actor: JwtAccessPayload,
  ) {
    return this.service.removeMember(vendorId, memberId, actor.sub);
  }
}
