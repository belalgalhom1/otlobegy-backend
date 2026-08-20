import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ZonesService } from './zones.service';
import { CreateZoneDto, UpdateZoneDto, CheckLocationDto, SearchCustomersInPolygonDto } from './dto/zone.dto';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { Permission } from '@prisma/client';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';


@ApiTags('Logistics - Zones')
@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @ApiStandardResponse()
  @Post()
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_SETTINGS)
  @ApiOperation({ summary: 'Create a new delivery zone' })
  create(@Body() createZoneDto: CreateZoneDto) {
    return this.zonesService.createZone(createZoneDto);
  }

  @ApiStandardResponse()
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all delivery zones' })
  findAll() {
    return this.zonesService.getAllZones();
  }

  @Public()
  @ApiStandardResponse()
  @Post('check-location')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Find zone by coordinates' })
  checkLocation(@Body() checkLocationDto: CheckLocationDto) {
    return this.zonesService.findZoneByLocation(checkLocationDto);
  }

  @ApiStandardResponse()
  @Get(':id')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_SETTINGS)
  @ApiOperation({ summary: 'Get a specific zone by ID' })
  findOne(@Param('id') id: string) {
    return this.zonesService.getZoneById(id);
  }

  @ApiStandardResponse()
  @Patch(':id')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_SETTINGS)
  @ApiOperation({ summary: 'Update a delivery zone' })
  update(@Param('id') id: string, @Body() updateZoneDto: UpdateZoneDto) {
    return this.zonesService.updateZone(id, updateZoneDto);
  }

  @ApiStandardResponse()
  @Delete(':id')
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_SETTINGS)
  @ApiOperation({ summary: 'Delete a delivery zone' })
  remove(@Param('id') id: string) {
    return this.zonesService.deleteZone(id);
  }

  @ApiStandardResponse()
  @Post('customers/search')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @RequirePermissions(Permission.MANAGE_SETTINGS)
  @ApiOperation({ summary: 'Search for customers within a polygon' })
  searchCustomers(@Body() dto: SearchCustomersInPolygonDto) {
    return this.zonesService.searchCustomersInPolygon(dto);
  }
}
