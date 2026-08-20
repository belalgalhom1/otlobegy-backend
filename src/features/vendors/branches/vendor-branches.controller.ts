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
  ForbiddenException,
} from '@nestjs/common';
import { VendorBranchesService } from './vendor-branches.service';
import {
  CreateVendorBranchDto,
  UpdateVendorBranchDto,
} from './dto/vendor-branch.dto';
import { VendorMember } from '../../../common/decorators/vendor-member.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentVendorBranch } from '../../../common/decorators/current-vendor-branch.decorator';
import {
  VendorErrors,
  VendorBranchErrors,
} from '../../../common/constants/response.constants';
import { Permission, VendorMemberRole } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../../common/decorators/api-response.decorator';


@ApiTags('Vendors - Branches')
@Controller('vendors/:vendorId/branches')
export class VendorBranchesController {
  constructor(private readonly service: VendorBranchesService) {}

  // Public — customers need to see branch locations.
  @Public()
  @ApiStandardResponse()
  @Get()
  @ApiOperation({ summary: 'List all branches for a vendor' })
  findAll(@Param('vendorId') vendorId: string) {
    return this.service.findAll(vendorId);
  }

  @Public()
  @ApiStandardResponse()
  @Get(':branchId')
  @ApiOperation({ summary: 'Get a specific branch by ID' })
  findOne(
    @Param('vendorId') vendorId: string,
    @Param('branchId') branchId: string,
  ) {
    return this.service.findOne(vendorId, branchId);
  }

  // OWNER or MANAGER can create/update/delete branches.
  @ApiStandardResponse()
  @Post()
  @ApiBearerAuth()
  @VendorMember({
    roles: [VendorMemberRole.OWNER, VendorMemberRole.MANAGER],
  })
  @ApiOperation({ summary: 'Create a new branch (Member)' })
  create(
    @Param('vendorId') vendorId: string,
    @Body() dto: CreateVendorBranchDto,
    @CurrentVendorBranch() assignedBranchId?: string | null,
  ) {
    if (assignedBranchId) {
      throw new ForbiddenException(VendorBranchErrors.CANNOT_CREATE_BRANCH);
    }
    return this.service.create(vendorId, dto);
  }

  @ApiStandardResponse()
  @Patch(':branchId')
  @ApiBearerAuth()
  @VendorMember({
    roles: [VendorMemberRole.OWNER, VendorMemberRole.MANAGER],
  })
  @ApiOperation({ summary: 'Update a branch (Member)' })
  update(
    @Param('vendorId') vendorId: string,
    @Param('branchId') branchId: string,
    @Body() dto: UpdateVendorBranchDto,
    @CurrentVendorBranch() assignedBranchId?: string | null,
  ) {
    if (assignedBranchId && assignedBranchId !== branchId) {
      throw new ForbiddenException(VendorBranchErrors.NOT_ASSIGNED_BRANCH);
    }
    return this.service.update(vendorId, branchId, dto);
  }

  @ApiStandardResponse()
  @Delete(':branchId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @VendorMember({
    roles: [VendorMemberRole.OWNER, VendorMemberRole.MANAGER],
  })
  @ApiOperation({ summary: 'Delete a branch (Member)' })
  remove(
    @Param('vendorId') vendorId: string,
    @Param('branchId') branchId: string,
    @CurrentVendorBranch() assignedBranchId?: string | null,
  ) {
    if (assignedBranchId && assignedBranchId !== branchId) {
      throw new ForbiddenException(VendorBranchErrors.NOT_ASSIGNED_BRANCH);
    }
    return this.service.remove(vendorId, branchId);
  }

  // Admin override — full access without membership.
  @ApiStandardResponse()
  @Post('admin')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_VENDORS)
  @ApiOperation({ summary: 'Create a new branch (Admin Override)' })
  adminCreate(
    @Param('vendorId') vendorId: string,
    @Body() dto: CreateVendorBranchDto,
  ) {
    return this.service.create(vendorId, dto);
  }

  @ApiStandardResponse()
  @Patch('admin/:branchId')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_VENDORS)
  @ApiOperation({ summary: 'Update a branch (Admin Override)' })
  adminUpdate(
    @Param('vendorId') vendorId: string,
    @Param('branchId') branchId: string,
    @Body() dto: UpdateVendorBranchDto,
  ) {
    return this.service.update(vendorId, branchId, dto);
  }

  @ApiStandardResponse()
  @Delete('admin/:branchId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_VENDORS)
  @ApiOperation({ summary: 'Delete a branch (Admin Override)' })
  adminRemove(
    @Param('vendorId') vendorId: string,
    @Param('branchId') branchId: string,
  ) {
    return this.service.remove(vendorId, branchId);
  }
}
