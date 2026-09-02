import { IntersectionType, PartialType } from '@nestjs/swagger';
import { PrismaModel } from '../../_gen/prisma-classes/index';

export class AccountResponseDto extends IntersectionType(
  PrismaModel.Account,
  PartialType(PrismaModel.AccountRelations)
) {}

export class PlatformSettingResponseDto extends IntersectionType(
  PrismaModel.PlatformSetting,
  PartialType(PrismaModel.PlatformSettingRelations)
) {}

export class ZoneResponseDto extends IntersectionType(
  PrismaModel.Zone,
  PartialType(PrismaModel.ZoneRelations)
) {}

export class UserResponseDto extends IntersectionType(
  PrismaModel.User,
  PartialType(PrismaModel.UserRelations)
) {}

export class DeviceResponseDto extends IntersectionType(
  PrismaModel.Device,
  PartialType(PrismaModel.DeviceRelations)
) {}

export class SessionResponseDto extends IntersectionType(
  PrismaModel.Session,
  PartialType(PrismaModel.SessionRelations)
) {}

export class NotificationResponseDto extends IntersectionType(
  PrismaModel.Notification,
  PartialType(PrismaModel.NotificationRelations)
) {}

export class NotificationSettingResponseDto extends IntersectionType(
  PrismaModel.NotificationSetting,
  PartialType(PrismaModel.NotificationSettingRelations)
) {}

export class ConversationResponseDto extends IntersectionType(
  PrismaModel.Conversation,
  PartialType(PrismaModel.ConversationRelations)
) {}

export class ConversationParticipantResponseDto extends IntersectionType(
  PrismaModel.ConversationParticipant,
  PartialType(PrismaModel.ConversationParticipantRelations)
) {}

export class MessageResponseDto extends IntersectionType(
  PrismaModel.Message,
  PartialType(PrismaModel.MessageRelations)
) {}

export class SupportTicketResponseDto extends IntersectionType(
  PrismaModel.SupportTicket,
  PartialType(PrismaModel.SupportTicketRelations)
) {}

export class CustomerResponseDto extends IntersectionType(
  PrismaModel.Customer,
  PartialType(PrismaModel.CustomerRelations)
) {}

export class CustomerCoinTransactionResponseDto extends IntersectionType(
  PrismaModel.CustomerCoinTransaction,
  PartialType(PrismaModel.CustomerCoinTransactionRelations)
) {}

export class FavoriteVendorResponseDto extends IntersectionType(
  PrismaModel.FavoriteVendor,
  PartialType(PrismaModel.FavoriteVendorRelations)
) {}

export class FavoriteProductResponseDto extends IntersectionType(
  PrismaModel.FavoriteProduct,
  PartialType(PrismaModel.FavoriteProductRelations)
) {}

export class AddressResponseDto extends IntersectionType(
  PrismaModel.Address,
  PartialType(PrismaModel.AddressRelations)
) {}

export class VendorVerticalResponseDto extends IntersectionType(
  PrismaModel.VendorVertical,
  PartialType(PrismaModel.VendorVerticalRelations)
) {}

export class VendorResponseDto extends IntersectionType(
  PrismaModel.Vendor,
  PartialType(PrismaModel.VendorRelations)
) {}

export class VendorMemberResponseDto extends IntersectionType(
  PrismaModel.VendorMember,
  PartialType(PrismaModel.VendorMemberRelations)
) {}

export class VendorBranchResponseDto extends IntersectionType(
  PrismaModel.VendorBranch,
  PartialType(PrismaModel.VendorBranchRelations)
) {}

export class VendorWalletTransactionResponseDto extends IntersectionType(
  PrismaModel.VendorWalletTransaction,
  PartialType(PrismaModel.VendorWalletTransactionRelations)
) {}

export class VendorStatisticResponseDto extends IntersectionType(
  PrismaModel.VendorStatistic,
  PartialType(PrismaModel.VendorStatisticRelations)
) {}

export class AppStatisticResponseDto extends IntersectionType(
  PrismaModel.AppStatistic,
  PartialType(PrismaModel.AppStatisticRelations)
) {}

export class MenuCategoryResponseDto extends IntersectionType(
  PrismaModel.MenuCategory,
  PartialType(PrismaModel.MenuCategoryRelations)
) {}

export class ProductResponseDto extends IntersectionType(
  PrismaModel.Product,
  PartialType(PrismaModel.ProductRelations)
) {}

export class ProductVariantResponseDto extends IntersectionType(
  PrismaModel.ProductVariant,
  PartialType(PrismaModel.ProductVariantRelations)
) {}

export class ProductOptionGroupResponseDto extends IntersectionType(
  PrismaModel.ProductOptionGroup,
  PartialType(PrismaModel.ProductOptionGroupRelations)
) {}

export class ProductOptionResponseDto extends IntersectionType(
  PrismaModel.ProductOption,
  PartialType(PrismaModel.ProductOptionRelations)
) {}

export class CartResponseDto extends IntersectionType(
  PrismaModel.Cart,
  PartialType(PrismaModel.CartRelations)
) {}

export class CartItemResponseDto extends IntersectionType(
  PrismaModel.CartItem,
  PartialType(PrismaModel.CartItemRelations)
) {}

export class CartItemOptionResponseDto extends IntersectionType(
  PrismaModel.CartItemOption,
  PartialType(PrismaModel.CartItemOptionRelations)
) {}

export class OrderResponseDto extends IntersectionType(
  PrismaModel.Order,
  PartialType(PrismaModel.OrderRelations)
) {}

export class OrderStatusEventResponseDto extends IntersectionType(
  PrismaModel.OrderStatusEvent,
  PartialType(PrismaModel.OrderStatusEventRelations)
) {}

export class OrderItemResponseDto extends IntersectionType(
  PrismaModel.OrderItem,
  PartialType(PrismaModel.OrderItemRelations)
) {}

export class OrderItemOptionResponseDto extends IntersectionType(
  PrismaModel.OrderItemOption,
  PartialType(PrismaModel.OrderItemOptionRelations)
) {}

export class DriverResponseDto extends IntersectionType(
  PrismaModel.Driver,
  PartialType(PrismaModel.DriverRelations)
) {}

export class DriverShiftResponseDto extends IntersectionType(
  PrismaModel.DriverShift,
  PartialType(PrismaModel.DriverShiftRelations)
) {}

export class ShiftPoolResponseDto extends IntersectionType(
  PrismaModel.ShiftPool,
  PartialType(PrismaModel.ShiftPoolRelations)
) {}

export class ShiftSwapRequestResponseDto extends IntersectionType(
  PrismaModel.ShiftSwapRequest,
  PartialType(PrismaModel.ShiftSwapRequestRelations)
) {}

export class DriverWalletTransactionResponseDto extends IntersectionType(
  PrismaModel.DriverWalletTransaction,
  PartialType(PrismaModel.DriverWalletTransactionRelations)
) {}

export class DriverStatisticResponseDto extends IntersectionType(
  PrismaModel.DriverStatistic,
  PartialType(PrismaModel.DriverStatisticRelations)
) {}

export class OrderDispatchResponseDto extends IntersectionType(
  PrismaModel.OrderDispatch,
  PartialType(PrismaModel.OrderDispatchRelations)
) {}

export class AuditLogResponseDto extends IntersectionType(
  PrismaModel.AuditLog,
  PartialType(PrismaModel.AuditLogRelations)
) {}

export class spatial_ref_sysResponseDto extends IntersectionType(
  PrismaModel.spatial_ref_sys,
  PartialType(PrismaModel.spatial_ref_sysRelations)
) {}

export class PromotionResponseDto extends IntersectionType(
  PrismaModel.Promotion,
  PartialType(PrismaModel.PromotionRelations)
) {}

export class OfferResponseDto extends IntersectionType(
  PrismaModel.Offer,
  PartialType(PrismaModel.OfferRelations)
) {}

export class MobileWalletResponseDto extends IntersectionType(
  PrismaModel.MobileWallet,
  PartialType(PrismaModel.MobileWalletRelations)
) {}

export class WalletTopUpRequestResponseDto extends IntersectionType(
  PrismaModel.WalletTopUpRequest,
  PartialType(PrismaModel.WalletTopUpRequestRelations)
) {}

