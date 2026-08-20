import { AuditActionType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLog {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  userId: string;

  @ApiPropertyOptional({ type: String })
  vendorId?: string;

  @ApiProperty({ enum: AuditActionType, enumName: 'AuditActionType' })
  actionType: AuditActionType = AuditActionType.OTHER;

  @ApiProperty({ type: String })
  action: string;

  @ApiProperty({ type: String })
  entityType: string;

  @ApiProperty({ type: String })
  entityId: string;

  @ApiPropertyOptional({ type: Object })
  oldValues?: object;

  @ApiPropertyOptional({ type: Object })
  newValues?: object;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiPropertyOptional({ type: String })
  sessionId?: string;
}
