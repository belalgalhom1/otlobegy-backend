import { User } from './user';
import { AuditLog } from './audit_log';
import { ApiProperty } from '@nestjs/swagger';

export class SessionRelations {
  @ApiProperty({ type: () => User })
  user: User;

  @ApiProperty({ isArray: true, type: () => AuditLog })
  auditLogs: AuditLog[];
}
