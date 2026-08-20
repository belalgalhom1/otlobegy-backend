import { AccountRelations as _AccountRelations } from './account_relations';
import { PlatformSettingRelations as _PlatformSettingRelations } from './platform_setting_relations';
import { ZoneRelations as _ZoneRelations } from './zone_relations';
import { UserRelations as _UserRelations } from './user_relations';
import { DeviceRelations as _DeviceRelations } from './device_relations';
import { SessionRelations as _SessionRelations } from './session_relations';
import { NotificationRelations as _NotificationRelations } from './notification_relations';
import { NotificationSettingRelations as _NotificationSettingRelations } from './notification_setting_relations';
import { ConversationRelations as _ConversationRelations } from './conversation_relations';
import { ConversationParticipantRelations as _ConversationParticipantRelations } from './conversation_participant_relations';
import { MessageRelations as _MessageRelations } from './message_relations';
import { SupportTicketRelations as _SupportTicketRelations } from './support_ticket_relations';
import { CustomerRelations as _CustomerRelations } from './customer_relations';
import { CustomerCoinTransactionRelations as _CustomerCoinTransactionRelations } from './customer_coin_transaction_relations';
import { FavoriteVendorRelations as _FavoriteVendorRelations } from './favorite_vendor_relations';
import { FavoriteProductRelations as _FavoriteProductRelations } from './favorite_product_relations';
import { AddressRelations as _AddressRelations } from './address_relations';
import { VendorVerticalRelations as _VendorVerticalRelations } from './vendor_vertical_relations';
import { VendorRelations as _VendorRelations } from './vendor_relations';
import { VendorMemberRelations as _VendorMemberRelations } from './vendor_member_relations';
import { VendorBranchRelations as _VendorBranchRelations } from './vendor_branch_relations';
import { VendorWalletTransactionRelations as _VendorWalletTransactionRelations } from './vendor_wallet_transaction_relations';
import { VendorStatisticRelations as _VendorStatisticRelations } from './vendor_statistic_relations';
import { AppStatisticRelations as _AppStatisticRelations } from './app_statistic_relations';
import { MenuCategoryRelations as _MenuCategoryRelations } from './menu_category_relations';
import { ProductRelations as _ProductRelations } from './product_relations';
import { ProductVariantRelations as _ProductVariantRelations } from './product_variant_relations';
import { ProductOptionGroupRelations as _ProductOptionGroupRelations } from './product_option_group_relations';
import { ProductOptionRelations as _ProductOptionRelations } from './product_option_relations';
import { CartRelations as _CartRelations } from './cart_relations';
import { CartItemRelations as _CartItemRelations } from './cart_item_relations';
import { CartItemOptionRelations as _CartItemOptionRelations } from './cart_item_option_relations';
import { OrderRelations as _OrderRelations } from './order_relations';
import { OrderStatusEventRelations as _OrderStatusEventRelations } from './order_status_event_relations';
import { OrderItemRelations as _OrderItemRelations } from './order_item_relations';
import { OrderItemOptionRelations as _OrderItemOptionRelations } from './order_item_option_relations';
import { DriverRelations as _DriverRelations } from './driver_relations';
import { DriverShiftRelations as _DriverShiftRelations } from './driver_shift_relations';
import { ShiftPoolRelations as _ShiftPoolRelations } from './shift_pool_relations';
import { ShiftSwapRequestRelations as _ShiftSwapRequestRelations } from './shift_swap_request_relations';
import { DriverWalletTransactionRelations as _DriverWalletTransactionRelations } from './driver_wallet_transaction_relations';
import { DriverStatisticRelations as _DriverStatisticRelations } from './driver_statistic_relations';
import { OrderDispatchRelations as _OrderDispatchRelations } from './order_dispatch_relations';
import { AuditLogRelations as _AuditLogRelations } from './audit_log_relations';
import { spatial_ref_sysRelations as _spatial_ref_sysRelations } from './spatial_ref_sys_relations';
import { PromotionRelations as _PromotionRelations } from './promotion_relations';
import { OfferRelations as _OfferRelations } from './offer_relations';
import { MobileWalletRelations as _MobileWalletRelations } from './mobile_wallet_relations';
import { WalletTopUpRequestRelations as _WalletTopUpRequestRelations } from './wallet_top_up_request_relations';
import { PlatformSetting as _PlatformSetting } from './platform_setting';
import { Zone as _Zone } from './zone';
import { User as _User } from './user';
import { Device as _Device } from './device';
import { Session as _Session } from './session';
import { Notification as _Notification } from './notification';
import { NotificationSetting as _NotificationSetting } from './notification_setting';
import { Conversation as _Conversation } from './conversation';
import { ConversationParticipant as _ConversationParticipant } from './conversation_participant';
import { Message as _Message } from './message';
import { SupportTicket as _SupportTicket } from './support_ticket';
import { Customer as _Customer } from './customer';
import { CustomerCoinTransaction as _CustomerCoinTransaction } from './customer_coin_transaction';
import { FavoriteVendor as _FavoriteVendor } from './favorite_vendor';
import { FavoriteProduct as _FavoriteProduct } from './favorite_product';
import { Address as _Address } from './address';
import { VendorVertical as _VendorVertical } from './vendor_vertical';
import { Vendor as _Vendor } from './vendor';
import { VendorMember as _VendorMember } from './vendor_member';
import { VendorBranch as _VendorBranch } from './vendor_branch';
import { VendorWalletTransaction as _VendorWalletTransaction } from './vendor_wallet_transaction';
import { VendorStatistic as _VendorStatistic } from './vendor_statistic';
import { AppStatistic as _AppStatistic } from './app_statistic';
import { MenuCategory as _MenuCategory } from './menu_category';
import { Product as _Product } from './product';
import { ProductVariant as _ProductVariant } from './product_variant';
import { ProductOptionGroup as _ProductOptionGroup } from './product_option_group';
import { ProductOption as _ProductOption } from './product_option';
import { Cart as _Cart } from './cart';
import { CartItem as _CartItem } from './cart_item';
import { CartItemOption as _CartItemOption } from './cart_item_option';
import { Order as _Order } from './order';
import { OrderStatusEvent as _OrderStatusEvent } from './order_status_event';
import { OrderItem as _OrderItem } from './order_item';
import { OrderItemOption as _OrderItemOption } from './order_item_option';
import { Driver as _Driver } from './driver';
import { DriverShift as _DriverShift } from './driver_shift';
import { ShiftPool as _ShiftPool } from './shift_pool';
import { ShiftSwapRequest as _ShiftSwapRequest } from './shift_swap_request';
import { DriverWalletTransaction as _DriverWalletTransaction } from './driver_wallet_transaction';
import { DriverStatistic as _DriverStatistic } from './driver_statistic';
import { OrderDispatch as _OrderDispatch } from './order_dispatch';
import { AuditLog as _AuditLog } from './audit_log';
import { spatial_ref_sys as _spatial_ref_sys } from './spatial_ref_sys';
import { Promotion as _Promotion } from './promotion';
import { Offer as _Offer } from './offer';
import { MobileWallet as _MobileWallet } from './mobile_wallet';
import { WalletTopUpRequest as _WalletTopUpRequest } from './wallet_top_up_request';
import { Account as _Account } from './account';

export namespace PrismaModel {
  export class AccountRelations extends _AccountRelations {}
  export class PlatformSettingRelations extends _PlatformSettingRelations {}
  export class ZoneRelations extends _ZoneRelations {}
  export class UserRelations extends _UserRelations {}
  export class DeviceRelations extends _DeviceRelations {}
  export class SessionRelations extends _SessionRelations {}
  export class NotificationRelations extends _NotificationRelations {}
  export class NotificationSettingRelations extends _NotificationSettingRelations {}
  export class ConversationRelations extends _ConversationRelations {}
  export class ConversationParticipantRelations extends _ConversationParticipantRelations {}
  export class MessageRelations extends _MessageRelations {}
  export class SupportTicketRelations extends _SupportTicketRelations {}
  export class CustomerRelations extends _CustomerRelations {}
  export class CustomerCoinTransactionRelations extends _CustomerCoinTransactionRelations {}
  export class FavoriteVendorRelations extends _FavoriteVendorRelations {}
  export class FavoriteProductRelations extends _FavoriteProductRelations {}
  export class AddressRelations extends _AddressRelations {}
  export class VendorVerticalRelations extends _VendorVerticalRelations {}
  export class VendorRelations extends _VendorRelations {}
  export class VendorMemberRelations extends _VendorMemberRelations {}
  export class VendorBranchRelations extends _VendorBranchRelations {}
  export class VendorWalletTransactionRelations extends _VendorWalletTransactionRelations {}
  export class VendorStatisticRelations extends _VendorStatisticRelations {}
  export class AppStatisticRelations extends _AppStatisticRelations {}
  export class MenuCategoryRelations extends _MenuCategoryRelations {}
  export class ProductRelations extends _ProductRelations {}
  export class ProductVariantRelations extends _ProductVariantRelations {}
  export class ProductOptionGroupRelations extends _ProductOptionGroupRelations {}
  export class ProductOptionRelations extends _ProductOptionRelations {}
  export class CartRelations extends _CartRelations {}
  export class CartItemRelations extends _CartItemRelations {}
  export class CartItemOptionRelations extends _CartItemOptionRelations {}
  export class OrderRelations extends _OrderRelations {}
  export class OrderStatusEventRelations extends _OrderStatusEventRelations {}
  export class OrderItemRelations extends _OrderItemRelations {}
  export class OrderItemOptionRelations extends _OrderItemOptionRelations {}
  export class DriverRelations extends _DriverRelations {}
  export class DriverShiftRelations extends _DriverShiftRelations {}
  export class ShiftPoolRelations extends _ShiftPoolRelations {}
  export class ShiftSwapRequestRelations extends _ShiftSwapRequestRelations {}
  export class DriverWalletTransactionRelations extends _DriverWalletTransactionRelations {}
  export class DriverStatisticRelations extends _DriverStatisticRelations {}
  export class OrderDispatchRelations extends _OrderDispatchRelations {}
  export class AuditLogRelations extends _AuditLogRelations {}
  export class spatial_ref_sysRelations extends _spatial_ref_sysRelations {}
  export class PromotionRelations extends _PromotionRelations {}
  export class OfferRelations extends _OfferRelations {}
  export class MobileWalletRelations extends _MobileWalletRelations {}
  export class WalletTopUpRequestRelations extends _WalletTopUpRequestRelations {}
  export class Account extends _Account {}
  export class PlatformSetting extends _PlatformSetting {}
  export class Zone extends _Zone {}
  export class User extends _User {}
  export class Device extends _Device {}
  export class Session extends _Session {}
  export class Notification extends _Notification {}
  export class NotificationSetting extends _NotificationSetting {}
  export class Conversation extends _Conversation {}
  export class ConversationParticipant extends _ConversationParticipant {}
  export class Message extends _Message {}
  export class SupportTicket extends _SupportTicket {}
  export class Customer extends _Customer {}
  export class CustomerCoinTransaction extends _CustomerCoinTransaction {}
  export class FavoriteVendor extends _FavoriteVendor {}
  export class FavoriteProduct extends _FavoriteProduct {}
  export class Address extends _Address {}
  export class VendorVertical extends _VendorVertical {}
  export class Vendor extends _Vendor {}
  export class VendorMember extends _VendorMember {}
  export class VendorBranch extends _VendorBranch {}
  export class VendorWalletTransaction extends _VendorWalletTransaction {}
  export class VendorStatistic extends _VendorStatistic {}
  export class AppStatistic extends _AppStatistic {}
  export class MenuCategory extends _MenuCategory {}
  export class Product extends _Product {}
  export class ProductVariant extends _ProductVariant {}
  export class ProductOptionGroup extends _ProductOptionGroup {}
  export class ProductOption extends _ProductOption {}
  export class Cart extends _Cart {}
  export class CartItem extends _CartItem {}
  export class CartItemOption extends _CartItemOption {}
  export class Order extends _Order {}
  export class OrderStatusEvent extends _OrderStatusEvent {}
  export class OrderItem extends _OrderItem {}
  export class OrderItemOption extends _OrderItemOption {}
  export class Driver extends _Driver {}
  export class DriverShift extends _DriverShift {}
  export class ShiftPool extends _ShiftPool {}
  export class ShiftSwapRequest extends _ShiftSwapRequest {}
  export class DriverWalletTransaction extends _DriverWalletTransaction {}
  export class DriverStatistic extends _DriverStatistic {}
  export class OrderDispatch extends _OrderDispatch {}
  export class AuditLog extends _AuditLog {}
  export class spatial_ref_sys extends _spatial_ref_sys {}
  export class Promotion extends _Promotion {}
  export class Offer extends _Offer {}
  export class MobileWallet extends _MobileWallet {}
  export class WalletTopUpRequest extends _WalletTopUpRequest {}

  export const extraModels = [
    PlatformSettingRelations,
    ZoneRelations,
    UserRelations,
    DeviceRelations,
    SessionRelations,
    NotificationRelations,
    NotificationSettingRelations,
    ConversationRelations,
    ConversationParticipantRelations,
    MessageRelations,
    SupportTicketRelations,
    CustomerRelations,
    CustomerCoinTransactionRelations,
    FavoriteVendorRelations,
    FavoriteProductRelations,
    AddressRelations,
    VendorVerticalRelations,
    VendorRelations,
    VendorMemberRelations,
    VendorBranchRelations,
    VendorWalletTransactionRelations,
    VendorStatisticRelations,
    AppStatisticRelations,
    MenuCategoryRelations,
    ProductRelations,
    ProductVariantRelations,
    ProductOptionGroupRelations,
    ProductOptionRelations,
    CartRelations,
    CartItemRelations,
    CartItemOptionRelations,
    OrderRelations,
    OrderStatusEventRelations,
    OrderItemRelations,
    OrderItemOptionRelations,
    DriverRelations,
    DriverShiftRelations,
    ShiftPoolRelations,
    ShiftSwapRequestRelations,
    DriverWalletTransactionRelations,
    DriverStatisticRelations,
    OrderDispatchRelations,
    AuditLogRelations,
    spatial_ref_sysRelations,
    PromotionRelations,
    OfferRelations,
    MobileWalletRelations,
    WalletTopUpRequestRelations,
    PlatformSetting,
    Zone,
    User,
    Device,
    Session,
    Notification,
    NotificationSetting,
    Conversation,
    ConversationParticipant,
    Message,
    SupportTicket,
    Customer,
    CustomerCoinTransaction,
    FavoriteVendor,
    FavoriteProduct,
    Address,
    VendorVertical,
    Vendor,
    VendorMember,
    VendorBranch,
    VendorWalletTransaction,
    VendorStatistic,
    AppStatistic,
    MenuCategory,
    Product,
    ProductVariant,
    ProductOptionGroup,
    ProductOption,
    Cart,
    CartItem,
    CartItemOption,
    Order,
    OrderStatusEvent,
    OrderItem,
    OrderItemOption,
    Driver,
    DriverShift,
    ShiftPool,
    ShiftSwapRequest,
    DriverWalletTransaction,
    DriverStatistic,
    OrderDispatch,
    AuditLog,
    spatial_ref_sys,
    Promotion,
    Offer,
    MobileWallet,
    WalletTopUpRequest,
  ];
}
