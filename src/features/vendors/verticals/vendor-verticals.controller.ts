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
  UploadedFile,
} from '@nestjs/common';
import { ApiFileUpload } from '../../../common/decorators/api-file-upload.decorator';
import { VendorVerticalsService } from 'src/features/vendors/verticals/vendor-verticals.service';
import {
  CreateVendorVerticalDto,
  UpdateVendorVerticalDto,
} from 'src/features/vendors/verticals/dto/vendor-vertical.dto';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { Permission } from '@prisma/client';
import { ApiStandardResponse } from '../../../common/decorators/api-response.decorator';

import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Vendors - Verticals (Categories)')
@Controller('vendor-verticals')
export class VendorVerticalsController {
  constructor(private readonly service: VendorVerticalsService) {}

  @Public()
  @ApiStandardResponse()
  @Get()
  @ApiOperation({ summary: 'Get all active vendor verticals' })
  findAllActive() {
    return this.service.findAllActive();
  }

  @ApiStandardResponse()
  @Get('admin')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_VENDORS)
  @ApiOperation({ summary: 'Get all vendor verticals (Admin)' })
  findAll() {
    return this.service.findAll();
  }

  @Public()
  @ApiStandardResponse()
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific vendor vertical by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiStandardResponse()
  @Post()
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_VENDORS)
  @ApiOperation({ summary: 'Create a new vendor vertical (Admin)' })
  create(@Body() dto: CreateVendorVerticalDto) {
    return this.service.create(dto);
  }

  @ApiStandardResponse()
  @Patch(':id')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_VENDORS)
  @ApiOperation({ summary: 'Update a vendor vertical (Admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateVendorVerticalDto) {
    return this.service.update(id, dto);
  }

  @ApiStandardResponse()
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_VENDORS)
  @ApiOperation({ summary: 'Delete a vendor vertical (Admin)' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @ApiStandardResponse()
  @Post('admin/:id/icon')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_VENDORS)
  @ApiFileUpload({ type: 'IMAGE', required: true })
  @ApiOperation({ summary: 'Upload vertical icon image' })
  uploadIcon(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadIcon(id, file);
  }
}
