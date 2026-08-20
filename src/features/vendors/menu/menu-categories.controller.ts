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
} from '@nestjs/common';
import { ApiFileUpload } from '../../../common/decorators/api-file-upload.decorator';
import { MenuCategoriesService } from './menu-categories.service';
import {
  CreateMenuCategoryDto,
  UpdateMenuCategoryDto,
  ReorderCategoriesDto,
} from './dto/menu-category.dto';
import { VendorMember } from '../../../common/decorators/vendor-member.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { Permission, VendorMemberRole } from '@prisma/client';
import { ApiStandardResponse } from '../../../common/decorators/api-response.decorator';

import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Vendors - Menu Categories')
@Controller('vendors/:vendorId/categories')
export class MenuCategoriesController {
  constructor(private readonly service: MenuCategoriesService) {}

  // ─── Public ───────────────────────────────────────────────────────────────
  // Customers need to browse vendor menus without authentication.

  @Public()
  @ApiStandardResponse()
  @Get()
  @ApiOperation({ summary: 'List all menu categories for a vendor' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  findAll(
    @Param('vendorId') vendorId: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.service.findAll(vendorId, activeOnly === 'true');
  }

  @Public()
  @ApiStandardResponse()
  @Get(':categoryId')
  @ApiOperation({ summary: 'Get a specific menu category by ID' })
  findOne(
    @Param('vendorId') vendorId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.service.findOne(vendorId, categoryId);
  }

  // ─── Vendor member: OWNER or MANAGER ─────────────────────────────────────

  @ApiStandardResponse()
  @Post()
  @ApiBearerAuth()
  @VendorMember({
    roles: [
      VendorMemberRole.OWNER,
      VendorMemberRole.MANAGER,
      VendorMemberRole.STAFF,
    ],
  })
  @ApiOperation({ summary: 'Create a new menu category (Member)' })
  create(
    @Param('vendorId') vendorId: string,
    @Body() dto: CreateMenuCategoryDto,
  ) {
    return this.service.create(vendorId, dto);
  }

  @ApiStandardResponse()
  @Patch('reorder')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @VendorMember({
    roles: [
      VendorMemberRole.OWNER,
      VendorMemberRole.MANAGER,
      VendorMemberRole.STAFF,
    ],
  })
  @ApiOperation({ summary: 'Reorder menu categories' })
  reorder(
    @Param('vendorId') vendorId: string,
    @Body() dto: ReorderCategoriesDto,
  ) {
    return this.service.reorder(vendorId, dto);
  }

  @ApiStandardResponse()
  @Patch(':categoryId')
  @ApiBearerAuth()
  @VendorMember({
    roles: [
      VendorMemberRole.OWNER,
      VendorMemberRole.MANAGER,
      VendorMemberRole.STAFF,
    ],
  })
  @ApiOperation({ summary: 'Update a menu category (Member)' })
  update(
    @Param('vendorId') vendorId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateMenuCategoryDto,
  ) {
    return this.service.update(vendorId, categoryId, dto);
  }

  @ApiStandardResponse()
  @Delete(':categoryId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @VendorMember({
    roles: [
      VendorMemberRole.OWNER,
      VendorMemberRole.MANAGER,
      VendorMemberRole.STAFF,
    ],
  })
  @ApiOperation({ summary: 'Delete a menu category (Member)' })
  remove(
    @Param('vendorId') vendorId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.service.remove(vendorId, categoryId);
  }

  @ApiStandardResponse()
  @Post(':categoryId/icon')
  @ApiBearerAuth()
  @VendorMember({
    roles: [
      VendorMemberRole.OWNER,
      VendorMemberRole.MANAGER,
      VendorMemberRole.STAFF,
    ],
  })
  @ApiFileUpload({ type: 'IMAGE', required: true })
  @ApiOperation({ summary: 'Upload menu category icon (Member)' })
  uploadIcon(
    @Param('vendorId') vendorId: string,
    @Param('categoryId') categoryId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadIcon(vendorId, categoryId, file);
  }

  // ─── Admin overrides ──────────────────────────────────────────────────────

  @ApiStandardResponse()
  @Post('admin')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_PRODUCTS)
  @ApiOperation({ summary: 'Create a new menu category (Admin Override)' })
  adminCreate(
    @Param('vendorId') vendorId: string,
    @Body() dto: CreateMenuCategoryDto,
  ) {
    return this.service.create(vendorId, dto);
  }

  @ApiStandardResponse()
  @Patch('admin/:categoryId')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_PRODUCTS)
  @ApiOperation({ summary: 'Update a menu category (Admin Override)' })
  adminUpdate(
    @Param('vendorId') vendorId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateMenuCategoryDto,
  ) {
    return this.service.update(vendorId, categoryId, dto);
  }

  @ApiStandardResponse()
  @Delete('admin/:categoryId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_PRODUCTS)
  @ApiOperation({ summary: 'Delete a menu category (Admin Override)' })
  adminRemove(
    @Param('vendorId') vendorId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.service.remove(vendorId, categoryId);
  }

  @ApiStandardResponse()
  @Post('admin/:categoryId/icon')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_PRODUCTS)
  @ApiFileUpload({ type: 'IMAGE', required: true })
  @ApiOperation({ summary: 'Upload menu category icon (Admin Override)' })
  adminUploadIcon(
    @Param('vendorId') vendorId: string,
    @Param('categoryId') categoryId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadIcon(vendorId, categoryId, file);
  }
}
