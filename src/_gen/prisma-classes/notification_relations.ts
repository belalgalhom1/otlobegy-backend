import { User } from './user';
import { ApiProperty } from '@nestjs/swagger';

export class NotificationRelations {
  @ApiProperty({ type: () => User })
  user: User;
}
