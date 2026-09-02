import { Controller, Get, Query } from '@nestjs/common';
import { AuditLog } from '../../_gen/prisma-classes/audit_log';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtAccessPayload } from 'src/common/interfaces/jwt-payload.interface';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';
import { AuditLogResponseDto } from "src/common/dto/response-models.dto";

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @ApiStandardResponse(AuditLogResponseDto)
  @Get()
  @ApiOperation({ summary: 'List audit logs with pagination and filters' })
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR_MEMBER)
  findAll(
    @Query() dto: QueryAuditLogsDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.service.findAll(dto, user);
  }
}
