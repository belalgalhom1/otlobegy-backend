import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UploadedFile,
} from '@nestjs/common';
import { ApiFileUpload } from 'src/common/decorators/api-file-upload.decorator';
import { PlatformSettingsService } from './platform-settings.service';
import {
  UpdatePlatformSettingsDto,
  AppVersionCheckDto,
  PublicPlatformSettingsDto,
} from './dto/platform-settings.dto';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { Permission } from '@prisma/client';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';
import { PlatformSetting } from '../../_gen/prisma-classes/platform_setting';

import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Platform - Settings & Versioning')
@Controller('platform-settings')
export class PlatformSettingsController {
  constructor(private readonly service: PlatformSettingsService) {}

  // ─── Public ───────────────────────────────────────────────────────────────
  // Mobile clients need maintenance mode + app versions on startup.

  @Public()
  @ApiStandardResponse()
  @Get('public')
  @ApiOperation({
    summary: 'Get public platform settings (maintenance mode, versions)',
  })
  getPublic() {
    return this.service.getPublicSettings();
  }

  @Public()
  @ApiStandardResponse()
  @Post('app-version-check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if app version is supported' })
  checkVersion(@Body() dto: AppVersionCheckDto) {
    return this.service.checkAppVersion(dto);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────
  // Full settings read requires MANAGE_SETTINGS permission.

  @ApiStandardResponse()
  @Get()
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_SETTINGS)
  @ApiOperation({ summary: 'Get all platform settings (Admin)' })
  getAll() {
    return this.service.getSettings();
  }

  @ApiStandardResponse()
  @Patch()
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_SETTINGS)
  @ApiOperation({ summary: 'Update platform settings (Admin)' })
  update(@Body() dto: UpdatePlatformSettingsDto) {
    return this.service.updateSettings(dto);
  }

  @ApiStandardResponse()
  @Post('home-cover')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_SETTINGS)
  @ApiFileUpload({ type: 'IMAGE', required: true })
  @ApiOperation({ summary: 'Upload home cover image' })
  uploadHomeCover(
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadHomeCover(file);
  }

  @ApiStandardResponse()
  @Post('motorcycle-icon')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_SETTINGS)
  @ApiFileUpload({ type: 'IMAGE', required: true })
  @ApiOperation({ summary: 'Upload motorcycle icon' })
  uploadMotorcycleIcon(
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadMotorcycleIcon(file);
  }

  @ApiStandardResponse()
  @Post('car-icon')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_SETTINGS)
  @ApiFileUpload({ type: 'IMAGE', required: true })
  @ApiOperation({ summary: 'Upload car icon' })
  uploadCarIcon(@UploadedFile() file: Express.Multer.File) {
    return this.service.uploadCarIcon(file);
  }

  @ApiStandardResponse()
  @Post('delivery-banner-icon')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_SETTINGS)
  @ApiFileUpload({ type: 'IMAGE', required: true })
  @ApiOperation({ summary: 'Upload delivery banner icon' })
  uploadDeliveryBannerIcon(
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadDeliveryBannerIcon(file);
  }
}
