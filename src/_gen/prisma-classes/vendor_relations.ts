import { AuditLog } from './audit_log';
import { Cart } from './cart';
import { Conversation } from './conversation';
import { FavoriteVendor } from './favorite_vendor';
import { MenuCategory } from './menu_category';
import { Order } from './order';
import { Product } from './product';
import { SupportTicket } from './support_ticket';
import { VendorBranch } from './vendor_branch';
import { VendorMember } from './vendor_member';
import { VendorStatistic } from './vendor_statistic';
import { VendorWalletTransaction } from './vendor_wallet_transaction';
import { Promotion } from './promotion';
import { Offer } from './offer';
import { VendorVertical } from './vendor_vertical';
import { ApiProperty } from '@nestjs/swagger';

export class VendorRelations {
  @ApiProperty({ isArray: true, type: () => AuditLog })
  auditLogs: AuditLog[];

  @ApiProperty({ isArray: true, type: () => Cart })
  carts: Cart[];

  @ApiProperty({ isArray: true, type: () => Conversation })
  conversations: Conversation[];

  @ApiProperty({ isArray: true, type: () => FavoriteVendor })
  favoritedBy: FavoriteVendor[];

  @ApiProperty({ isArray: true, type: () => MenuCategory })
  categories: MenuCategory[];

  @ApiProperty({ isArray: true, type: () => Order })
  orders: Order[];

  @ApiProperty({ isArray: true, type: () => Product })
  products: Product[];

  @ApiProperty({ isArray: true, type: () => SupportTicket })
  supportTickets: SupportTicket[];

  @ApiProperty({ isArray: true, type: () => VendorBranch })
  branches: VendorBranch[];

  @ApiProperty({ isArray: true, type: () => VendorMember })
  members: VendorMember[];

  @ApiProperty({ isArray: true, type: () => VendorStatistic })
  statistics: VendorStatistic[];

  @ApiProperty({ isArray: true, type: () => VendorWalletTransaction })
  walletTransactions: VendorWalletTransaction[];

  @ApiProperty({ isArray: true, type: () => Promotion })
  promotions: Promotion[];

  @ApiProperty({ isArray: true, type: () => Offer })
  offers: Offer[];

  @ApiProperty({ type: () => VendorVertical })
  vertical: VendorVertical;
}
