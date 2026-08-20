import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiFileUpload } from 'src/common/decorators/api-file-upload.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotions.dto';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { Permission } from '@prisma/client';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(
    private readonly promotionsService: PromotionsService,
    private readonly storageService: StorageService,
  ) {}

  @Public()
  @ApiStandardResponse()
  @Get()
  @ApiOperation({ summary: 'Get all active promotions for customer app' })
  findAllActive() {
    return this.promotionsService.findAllActive();
  }

  @ApiStandardResponse()
  @Get('admin')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_PROMOTIONS)
  @ApiOperation({ summary: 'Get all promotions (Admin)' })
  findAll() {
    return this.promotionsService.findAll();
  }

  @ApiStandardResponse()
  @Get('admin/:id')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_PROMOTIONS)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotionsService.findOne(id);
  }

  @ApiStandardResponse()
  @Post('admin')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_PROMOTIONS)
  @ApiFileUpload({ type: 'IMAGE', required: false })
  async create(
    @Body() dto: CreatePromotionDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      dto.imageUrl = await this.storageService.upload(file, 'promotions');
    }
    delete dto.file;
    return this.promotionsService.create(dto);
  }

  @ApiStandardResponse()
  @Patch('admin/:id')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_PROMOTIONS)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.promotionsService.update(id, dto);
  }

  @ApiStandardResponse()
  @Delete('admin/:id')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_PROMOTIONS)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotionsService.remove(id);
  }

  @ApiStandardResponse()
  @Post('admin/:id/image')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_PROMOTIONS)
  @ApiFileUpload({ type: 'IMAGE', required: true })
  async uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const path = await this.storageService.upload(file, 'promotions');
    await this.promotionsService.updateImage(id, path);
    return { url: path };
  }
}
