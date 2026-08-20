import { User } from './user';
import { ApiProperty } from '@nestjs/swagger';

export class DeviceRelations {
  @ApiProperty({ type: () => User })
  user: User;
}
