import { User } from './user';
import { ApiProperty } from '@nestjs/swagger';

export class AccountRelations {
  @ApiProperty({ type: () => User })
  user: User;
}
