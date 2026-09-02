import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { ApiStandardResponse } from './common/decorators/api-response.decorator';

@ApiTags('Health & System')
@Controller()
export class ApiController {
  @Get()
  @Public()
  @ApiStandardResponse()
  @ApiOperation({ summary: 'API Health Check' })
  root() {
    return { message: 'ok' };
  }
}
