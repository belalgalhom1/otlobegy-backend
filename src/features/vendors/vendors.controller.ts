import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UploadedFile,
  ForbiddenException,
} from '@nestjs/common';
import { ApiFileUpload } from 'src/common/decorators/api-file-upload.decorator';
import { VendorsService } from './vendors.service';
import {
  CreateVendorDto,
  UpdateVendorDto,
  UpdateVendorStatusDto,
  QueryVendorsDto,
} from './dto/vendor.dto';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { VendorMember } from 'src/common/decorators/vendor-member.decorator';
import { CurrentVendorBranch } from 'src/common/decorators/current-vendor-branch.decorator';
import { VendorErrors } from 'src/common/constants/response.constants';
import { Permission, VendorMemberRole } from '@prisma/client';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';

import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Vendors - Core Management')
@Controller('vendors')
export class VendorsController {
  constructor(private readonly service: VendorsService) {}

  // ─── Public ───────────────────────────────────────────────────────────────

  @Public()
  @ApiStandardResponse()
  @Get()
  @ApiOperation({ summary: 'List all vendors with filters' })
  findAll(@Query() dto: QueryVendorsDto) {
    return this.service.findAll(dto);
  }

  @Public()
  @ApiStandardResponse()
  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Find a vendor by its slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  @Public()
  @ApiStandardResponse()
  @Get('discovery/search')
  @ApiOperation({ summary: 'Global discovery search for vendors and products' })
  searchDiscovery(@Query() dto: QueryVendorsDto) {
    return this.service.searchDiscovery(dto);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  @ApiStandardResponse()
  @Get('admin')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_VENDORS)
  @ApiOperation({ summary: 'List all vendors (Admin)' })
  adminFindAll(@Query() dto: QueryVendorsDto) {
    return this.service.adminFindAll(dto);
  }

  @Public()
  @ApiStandardResponse()
  @Get(':vendorId')
  @ApiOperation({ summary: 'Get a specific vendor by ID' })
  findOne(@Param('vendorId') vendorId: string) {
    return this.service.findOne(vendorId);
  }

  @ApiStandardResponse()
  @Post()
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_VENDORS)
  @ApiOperation({ summary: 'Create a new vendor (Admin)' })
  create(@Body() dto: CreateVendorDto) {
    return this.service.create(dto);
  }

  @ApiStandardResponse()
  @Patch(':vendorId')
  @ApiBearerAuth()
  @VendorMember({ roles: [VendorMemberRole.OWNER, VendorMemberRole.MANAGER] })
  @ApiOperation({ summary: 'Update vendor information' })
  update(
    @Param('vendorId') vendorId: string,
    @Body() dto: UpdateVendorDto,
    @CurrentVendorBranch() assignedBranchId?: string | null,
  ) {
    if (assignedBranchId)
      throw new ForbiddenException(VendorErrors.CANNOT_MODIFY_GLOBAL_SETTINGS);
    return this.service.update(vendorId, dto);
  }

  @ApiStandardResponse()
  @Patch(':vendorId/status')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @VendorMember({ roles: [VendorMemberRole.OWNER, VendorMemberRole.MANAGER] })
  @ApiOperation({ summary: 'Update vendor status' })
  updateStatus(
    @Param('vendorId') vendorId: string,
    @Body() dto: UpdateVendorStatusDto,
    @CurrentVendorBranch() assignedBranchId?: string | null,
  ) {
    if (assignedBranchId)
      throw new ForbiddenException(VendorErrors.CANNOT_MODIFY_GLOBAL_STATUS);
    return this.service.updateStatus(vendorId, dto);
  }

  @ApiStandardResponse()
  @Post(':vendorId/logo')
  @ApiBearerAuth()
  @VendorMember({ roles: [VendorMemberRole.OWNER, VendorMemberRole.MANAGER] })
  @ApiFileUpload({ type: 'IMAGE', required: true })
  @ApiOperation({ summary: 'Upload vendor logo image' })
  uploadLogo(
    @Param('vendorId') vendorId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentVendorBranch() assignedBranchId?: string | null,
  ) {
    if (assignedBranchId)
      throw new ForbiddenException(VendorErrors.CANNOT_MODIFY_GLOBAL_LOGO);
    return this.service.uploadLogo(vendorId, file);
  }

  @ApiStandardResponse()
  @Post(':vendorId/cover')
  @ApiBearerAuth()
  @VendorMember({ roles: [VendorMemberRole.OWNER, VendorMemberRole.MANAGER] })
  @ApiFileUpload({ type: 'IMAGE', required: true })
  @ApiOperation({ summary: 'Upload vendor cover image' })
  uploadCover(
    @Param('vendorId') vendorId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentVendorBranch() assignedBranchId?: string | null,
  ) {
    if (assignedBranchId)
      throw new ForbiddenException(VendorErrors.CANNOT_MODIFY_GLOBAL_COVER);
    return this.service.uploadCover(vendorId, file);
  }

  @ApiStandardResponse()
  @Delete(':vendorId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_VENDORS)
  @ApiOperation({ summary: 'Delete a vendor (Admin)' })
  remove(@Param('vendorId') vendorId: string) {
    return this.service.remove(vendorId);
  }

  // ─── Vendor member self-view ──────────────────────────────────────────────
  // Members can view their own vendor's profile without admin permissions.

  @ApiStandardResponse()
  @Get(':vendorId/me')
  @ApiBearerAuth()
  @VendorMember()
  @ApiOperation({ summary: 'Get my vendor profile (Member)' })
  getMyVendor(@Param('vendorId') vendorId: string) {
    return this.service.findOne(vendorId);
  }
}
