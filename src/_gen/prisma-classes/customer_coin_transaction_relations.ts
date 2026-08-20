import { Customer } from './customer';
import { ApiProperty } from '@nestjs/swagger';

export class CustomerCoinTransactionRelations {
  @ApiProperty({ type: () => Customer })
  customer: Customer;
}
