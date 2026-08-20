import { User } from './user';
import { ApiProperty } from '@nestjs/swagger';

export class NotificationSettingRelations {
  @ApiProperty({ type: () => User })
  user: User;
}
