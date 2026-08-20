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
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateProductVariantDto,
  UpdateProductVariantDto,
  CreateOptionGroupDto,
  UpdateOptionGroupDto,
  CreateProductOptionDto,
  UpdateProductOptionDto,
  QueryProductsDto,
} from './dto/product.dto';
import { VendorMember } from '../../../common/decorators/vendor-member.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { Permission, VendorMemberRole } from '@prisma/client';
import { ApiStandardResponse } from '../../../common/decorators/api-response.decorator';

import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Vendors - Products')
@Controller('vendors/:vendorId/products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  // ─── Public — customers browse menus ─────────────────────────────────────

  @Public()
  @ApiStandardResponse()
  @Get()
  @ApiOperation({ summary: 'List all products for a vendor' })
  findAll(@Param('vendorId') vendorId: string, @Query() dto: QueryProductsDto) {
    return this.service.findAll(vendorId, dto);
  }

  @Public()
  @ApiStandardResponse()
  @Get(':productId')
  @ApiOperation({ summary: 'Get a specific product by ID' })
  findOne(
    @Param('vendorId') vendorId: string,
    @Param('productId') productId: string,
  ) {
    return this.service.findOne(vendorId, productId);
  }

  // ─── Vendor member: any member can read; OWNER/MANAGER can write ──────────

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
  @ApiOperation({ summary: 'Create a new product (Member)' })
  create(@Param('vendorId') vendorId: string, @Body() dto: CreateProductDto) {
    return this.service.create(vendorId, dto);
  }

  @ApiStandardResponse()
  @Patch(':productId')
  @ApiBearerAuth()
  @VendorMember({
    roles: [
      VendorMemberRole.OWNER,
      VendorMemberRole.MANAGER,
      VendorMemberRole.STAFF,
    ],
  })
  @ApiOperation({ summary: 'Update a product (Member)' })
  update(
    @Param('vendorId') vendorId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.service.update(vendorId, productId, dto);
  }

  @ApiStandardResponse()
  @Post(':productId/image')
  @ApiBearerAuth()
  @VendorMember({
    roles: [
      VendorMemberRole.OWNER,
      VendorMemberRole.MANAGER,
      VendorMemberRole.STAFF,
    ],
  })
  @ApiFileUpload({ type: 'IMAGE', required: true })
  @ApiOperation({ summary: 'Upload product image' })
  uploadImage(
    @Param('vendorId') vendorId: string,
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadImage(vendorId, productId, file);
  }

  @ApiStandardResponse()
  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @VendorMember({
    roles: [
      VendorMemberRole.OWNER,
      VendorMemberRole.MANAGER,
      VendorMemberRole.STAFF,
    ],
  })
  @ApiOperation({ summary: 'Delete a product (Member)' })
  remove(
    @Param('vendorId') vendorId: string,
    @Param('productId') productId: string,
  ) {
    return this.service.remove(vendorId, productId);
  }

  // ─── Variants ─────────────────────────────────────────────────────────────

  @ApiStandardResponse()
  @Post(':productId/variants')
  @ApiBearerAuth()
  @VendorMember({
    roles: [
      VendorMemberRole.OWNER,
      VendorMemberRole.MANAGER,
      VendorMemberRole.STAFF,
    ],
  })
  @ApiOperation({ summary: 'Add a variant to a product' })
  addVariant(
    @Param('vendorId') vendorId: string,
    @Param('productId') productId: string,
    @Body() dto: CreateProductVariantDto,
  ) {
    return this.service.addVariant(vendorId, productId, dto);
  }

  @ApiStandardResponse()
  @Patch(':productId/variants/:variantId')
  @ApiBearerAuth()
  @VendorMember({
    roles: [
      VendorMemberRole.OWNER,
      VendorMemberRole.MANAGER,
      VendorMemberRole.STAFF,
    ],
  })
  @ApiOperation({ summary: 'Update a product variant' })
  updateVariant(
    @Param('vendorId') vendorId: string,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.service.updateVariant(vendorId, productId, variantId, dto);
  }

  @ApiStandardResponse()
  @Delete(':productId/variants/:variantId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @VendorMember({
    roles: [
      VendorMemberRole.OWNER,
      VendorMemberRole.MANAGER,
      VendorMemberRole.STAFF,
    ],
  })
  @ApiOperation({ summary: 'Delete a product variant' })
  removeVariant(
    @Param('vendorId') vendorId: string,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.service.removeVariant(vendorId, productId, variantId);
  }

  // ─── Option groups (on product) ───────────────────────────────────────────

  @ApiStandardResponse()
  @Post(':productId/option-groups')
  @ApiBearerAuth()
  @VendorMember({
    roles: [
      VendorMemberRole.OWNER,
      VendorMemberRole.MANAGER,
      VendorMemberRole.STAFF,
    ],
  })
  @ApiOperation({ summary: 'Add an option group to a product' })
  addOptionGroup(
    @Param('vendorId') vendorId: string,
    @Param('productId') productId: string,
    @Body() dto: CreateOptionGroupDto,
  ) {
    return this.service.addOptionGroup(vendorId, productId, dto);
  }

  @ApiStandardResponse()
  @Patch(':productId/option-groups/:groupId')
  @ApiBearerAuth()
  @VendorMember({
    roles: [
      VendorMemberRole.OWNER,
      VendorMemberRole.MANAGER,
      VendorMemberRole.STAFF,
    ],
  })
  @ApiOperation({ summary: 'Update a product option group' })
  updateOptionGroup(
    @Param('vendorId') vendorId: string,
    @Param('productId') productId: string,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateOptionGroupDto,
  ) {
    return this.service.updateOptionGroup(vendorId, productId, groupId, dto);
  }

  @ApiStandardResponse()
  @Delete(':productId/option-groups/:groupId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @VendorMember({
    roles: [
      VendorMemberRole.OWNER,
      VendorMemberRole.MANAGER,
      VendorMemberRole.STAFF,
    ],
  })
  @ApiOperation({ summary: 'Delete a product option group' })
  removeOptionGroup(
    @Param('vendorId') vendorId: string,
    @Param('productId') productId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.service.removeOptionGroup(vendorId, productId, groupId);
  }

  // ─── Option groups (on variant) ───────────────────────────────────────────

  @ApiStandardResponse()
  @Post(':productId/variants/:variantId/option-groups')
  @ApiBearerAuth()
  @VendorMember({
    roles: [
      VendorMemberRole.OWNER,
      VendorMemberRole.MANAGER,
      VendorMemberRole.STAFF,
    ],
  })
  @ApiOperation({ summary: 'Add an option group to a product variant' })
  addVariantOptionGroup(
    @Param('vendorId') vendorId: string,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: CreateOptionGroupDto,
  ) {
    return this.service.addOptionGroup(vendorId, productId, dto, variantId);
  }

  // ─── Options within a group ───────────────────────────────────────────────

  @ApiStandardResponse()
  @Post(':productId/option-groups/:groupId/options')
  @ApiBearerAuth()
  @VendorMember({
    roles: [
      VendorMemberRole.OWNER,
      VendorMemberRole.MANAGER,
      VendorMemberRole.STAFF,
    ],
  })
  @ApiOperation({ summary: 'Add an option to a group' })
  addOption(
    @Param('vendorId') vendorId: string,
    @Param('productId') productId: string,
    @Param('groupId') groupId: string,
    @Body() dto: CreateProductOptionDto,
  ) {
    return this.service.addOption(vendorId, productId, groupId, dto);
  }

  @ApiStandardResponse()
  @Patch(':productId/option-groups/:groupId/options/:optionId')
  @ApiBearerAuth()
  @VendorMember({
    roles: [
      VendorMemberRole.OWNER,
      VendorMemberRole.MANAGER,
      VendorMemberRole.STAFF,
    ],
  })
  @ApiOperation({ summary: 'Update an option in a group' })
  updateOption(
    @Param('vendorId') vendorId: string,
    @Param('productId') productId: string,
    @Param('groupId') groupId: string,
    @Param('optionId') optionId: string,
    @Body() dto: UpdateProductOptionDto,
  ) {
    return this.service.updateOption(
      vendorId,
      productId,
      groupId,
      optionId,
      dto,
    );
  }

  @ApiStandardResponse()
  @Delete(':productId/option-groups/:groupId/options/:optionId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @VendorMember({
    roles: [
      VendorMemberRole.OWNER,
      VendorMemberRole.MANAGER,
      VendorMemberRole.STAFF,
    ],
  })
  @ApiOperation({ summary: 'Delete an option from a group' })
  removeOption(
    @Param('vendorId') vendorId: string,
    @Param('productId') productId: string,
    @Param('groupId') groupId: string,
    @Param('optionId') optionId: string,
  ) {
    return this.service.removeOption(vendorId, productId, groupId, optionId);
  }

  // ─── Admin overrides ──────────────────────────────────────────────────────

  @ApiStandardResponse()
  @Post('admin')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_PRODUCTS)
  @ApiOperation({ summary: 'Create a new product (Admin Override)' })
  adminCreate(
    @Param('vendorId') vendorId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.service.create(vendorId, dto);
  }

  @ApiStandardResponse()
  @Patch('admin/:productId')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_PRODUCTS)
  @ApiOperation({ summary: 'Update a product (Admin Override)' })
  adminUpdate(
    @Param('vendorId') vendorId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.service.update(vendorId, productId, dto);
  }

  @ApiStandardResponse()
  @Delete('admin/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_PRODUCTS)
  @ApiOperation({ summary: 'Delete a product (Admin Override)' })
  adminRemove(
    @Param('vendorId') vendorId: string,
    @Param('productId') productId: string,
  ) {
    return this.service.remove(vendorId, productId);
  }
}
