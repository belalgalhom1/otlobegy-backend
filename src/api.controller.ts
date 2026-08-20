import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health & System')
@Controller()
export class ApiController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'API Health Check' })
  root() {
    return { message: 'ok' };
  }
}
