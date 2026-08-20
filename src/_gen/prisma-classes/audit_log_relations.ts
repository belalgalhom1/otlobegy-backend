import { User } from './user';
import { Vendor } from './vendor';
import { Session } from './session';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogRelations {
  @ApiProperty({ type: () => User })
  user: User;

  @ApiPropertyOptional({ type: () => Vendor })
  vendor?: Vendor;

  @ApiPropertyOptional({ type: () => Session })
  session?: Session;
}
