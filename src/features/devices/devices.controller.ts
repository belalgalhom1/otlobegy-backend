import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/device.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';


@ApiTags('Devices - Push Notifications')
@ApiBearerAuth()
@Controller('devices')
export class DevicesController {
  constructor(private readonly deviceService: DevicesService) {}

  @ApiStandardResponse()
  @Post()
  @ApiOperation({ summary: 'Register a device for push notifications' })
  async register(
    @CurrentUser('sub') userId: string,
    @Body() dto: RegisterDeviceDto,
  ) {
    await this.deviceService.register(userId, dto);
    return { message: 'common.success.operation' };
  }

  @ApiStandardResponse()
  @Delete(':token')
  @ApiOperation({ summary: 'Remove a device token' })
  async remove(
    @CurrentUser('sub') userId: string,
    @Param('token') token: string,
  ) {
    await this.deviceService.remove(userId, token);
    return { message: 'common.success.operation' };
  }
}
