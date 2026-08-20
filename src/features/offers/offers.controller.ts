import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OffersService } from './offers.service';
import {
  CreateOfferDto,
  UpdateOfferDto,
} from '../promotions/dto/promotions.dto';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { Permission } from '@prisma/client';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Offers')
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Public()
  @ApiStandardResponse()
  @Get()
  @ApiOperation({ summary: 'Get all active product offers' })
  findAllActive() {
    return this.offersService.findAllActive();
  }

  @ApiStandardResponse()
  @Get('admin')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_PROMOTIONS)
  @ApiOperation({ summary: 'Get all offers (Admin)' })
  findAll() {
    return this.offersService.findAll();
  }

  @ApiStandardResponse()
  @Post('admin')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_PROMOTIONS)
  @ApiOperation({ summary: 'Create new product offer' })
  create(@Body() dto: CreateOfferDto) {
    return this.offersService.create(dto);
  }

  @ApiStandardResponse()
  @Patch('admin/:id')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_PROMOTIONS)
  @ApiOperation({ summary: 'Update product offer' })
  update(@Param('id') id: string, @Body() dto: UpdateOfferDto) {
    return this.offersService.update(id, dto);
  }

  @ApiStandardResponse()
  @Delete('admin/:id')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_PROMOTIONS)
  @ApiOperation({ summary: 'Delete product offer' })
  remove(@Param('id') id: string) {
    return this.offersService.remove(id);
  }
}
