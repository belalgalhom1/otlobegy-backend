import { Address } from './address';
import { Cart } from './cart';
import { User } from './user';
import { FavoriteProduct } from './favorite_product';
import { FavoriteVendor } from './favorite_vendor';
import { Order } from './order';
import { CustomerCoinTransaction } from './customer_coin_transaction';
import { ApiProperty } from '@nestjs/swagger';

export class CustomerRelations {
  @ApiProperty({ isArray: true, type: () => Address })
  addresses: Address[];

  @ApiProperty({ isArray: true, type: () => Cart })
  carts: Cart[];

  @ApiProperty({ type: () => User })
  user: User;

  @ApiProperty({ isArray: true, type: () => FavoriteProduct })
  favoriteProducts: FavoriteProduct[];

  @ApiProperty({ isArray: true, type: () => FavoriteVendor })
  favoriteVendors: FavoriteVendor[];

  @ApiProperty({ isArray: true, type: () => Order })
  orders: Order[];

  @ApiProperty({ isArray: true, type: () => CustomerCoinTransaction })
  coinTransactions: CustomerCoinTransaction[];
}
