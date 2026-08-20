import { Customer } from './customer';
import { ApiProperty } from '@nestjs/swagger';

export class AddressRelations {
  @ApiProperty({ type: () => Customer })
  customer: Customer;
}
