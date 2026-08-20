-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateSequence
CREATE SEQUENCE IF NOT EXISTS "order_number_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

-- CreateSequence
CREATE SEQUENCE IF NOT EXISTS "ticket_number_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

-- CreateEnum
CREATE TYPE "CoinTransactionType" AS ENUM ('EARNED', 'SPENT', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('ANDROID', 'IOS', 'WEB');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('EN', 'AR');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'DRIVER', 'VENDOR_MEMBER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('MANAGE_ORDERS', 'MANAGE_PRODUCTS', 'MANAGE_VENDORS', 'MANAGE_DRIVERS', 'MANAGE_CUSTOMERS', 'MANAGE_TICKETS', 'MANAGE_CONVERSATIONS', 'VIEW_STATISTICS', 'MANAGE_SETTINGS', 'MANAGE_USERS', 'VIEW_FINANCIALS', 'MANAGE_FINANCE', 'MANAGE_PROMOTIONS', 'MANAGE_ANNOUNCEMENTS', 'VIEW_AUDIT_LOGS');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER_UPDATE', 'CHAT_MESSAGE', 'PROMOTION', 'SYSTEM', 'PAYMENT', 'TICKET_UPDATE', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'LOCATION', 'SYSTEM', 'PRODUCT');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('ORDER', 'SUPPORT', 'VENDOR');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('CLOSED', 'OPEN', 'PAUSED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VendorMemberRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('BICYCLE', 'MOTORCYCLE', 'CAR', 'VAN', 'TRUCK', 'MOTOR_TRICYCLE');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('OFFLINE', 'ONLINE', 'BUSY', 'ON_DELIVERY', 'ON_BREAK', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DriverTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD');

-- CreateEnum
CREATE TYPE "SwapRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DriverShiftStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'MISSED');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('DELIVERY_FEE', 'CASH_COLLECTED', 'CASH_HANDED_TO_VENDOR', 'PAYOUT', 'PENALTY', 'BONUS', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "VendorTransactionType" AS ENUM ('ORDER_REVENUE', 'COMMISSION_DEDUCTION', 'CASH_COLLECTED', 'PAYOUT', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "StatisticPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CHANGES_REQUESTED', 'PENDING_CUSTOMER_APPROVAL', 'ACCEPTED', 'PREPARING', 'LOOKING_FOR_DRIVER', 'DRIVER_ASSIGNED', 'PENDING_PAYMENT', 'READY_FOR_PICKUP', 'PICKED_UP', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('STANDARD', 'CUSTOM_DELIVERY', 'RIDE');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH_ON_DELIVERY', 'MOBILE_WALLET');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'FAILED', 'PAID', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_ON_USER', 'ESCALATED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('DELIVERY', 'VENDOR', 'PAYMENT', 'ACCOUNT', 'RETURN_COMPLAINT', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AuditActionType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'OTHER');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('BANNER', 'VENDOR', 'PRODUCT', 'EXTERNAL_LINK', 'POPUP', 'NOTIFICATION');

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('VODAFONE', 'ORANGE', 'WE', 'ETISALAT', 'INSTAPAY');

-- CreateEnum
CREATE TYPE "TopUpStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "defaultCommissionRate" INTEGER NOT NULL DEFAULT 10,
    "deliveryCommissionRate" INTEGER NOT NULL DEFAULT 20,
    "defaultTaxRate" INTEGER NOT NULL DEFAULT 14,
    "minOrderAmount" INTEGER NOT NULL DEFAULT 0,
    "baseDeliveryFee" INTEGER NOT NULL DEFAULT 15,
    "pricePerKm" INTEGER NOT NULL DEFAULT 3,
    "pricePerKmBicycle" INTEGER NOT NULL DEFAULT 2,
    "pricePerKmMotorcycle" INTEGER NOT NULL DEFAULT 3,
    "pricePerKmCar" INTEGER NOT NULL DEFAULT 5,
    "pricePerKmVan" INTEGER NOT NULL DEFAULT 8,
    "pricePerKmTruck" INTEGER NOT NULL DEFAULT 12,
    "pricePerKmMotorTricycle" INTEGER NOT NULL DEFAULT 4,
    "maxDeliveryFee" INTEGER NOT NULL DEFAULT 0,
    "minDeliveryFeeBicycle" INTEGER NOT NULL DEFAULT 15,
    "maxDeliveryFeeBicycle" INTEGER NOT NULL DEFAULT 0,
    "minDeliveryFeeMotorcycle" INTEGER NOT NULL DEFAULT 15,
    "maxDeliveryFeeMotorcycle" INTEGER NOT NULL DEFAULT 0,
    "minDeliveryFeeCar" INTEGER NOT NULL DEFAULT 15,
    "maxDeliveryFeeCar" INTEGER NOT NULL DEFAULT 0,
    "requireCustomerApproval" BOOLEAN NOT NULL DEFAULT true,
    "customerApprovalTimeoutMins" INTEGER NOT NULL DEFAULT 5,
    "minDeliveryFeeVan" INTEGER NOT NULL DEFAULT 15,
    "maxDeliveryFeeVan" INTEGER NOT NULL DEFAULT 0,
    "minDeliveryFeeTruck" INTEGER NOT NULL DEFAULT 15,
    "maxDeliveryFeeTruck" INTEGER NOT NULL DEFAULT 0,
    "minDeliveryFeeMotorTricycle" INTEGER NOT NULL DEFAULT 15,
    "maxDeliveryFeeMotorTricycle" INTEGER NOT NULL DEFAULT 0,
    "allowBicycle" BOOLEAN NOT NULL DEFAULT true,
    "allowMotorcycle" BOOLEAN NOT NULL DEFAULT true,
    "allowCar" BOOLEAN NOT NULL DEFAULT true,
    "allowVan" BOOLEAN NOT NULL DEFAULT true,
    "allowTruck" BOOLEAN NOT NULL DEFAULT true,
    "allowMotorTricycle" BOOLEAN NOT NULL DEFAULT true,
    "minOrderKm" INTEGER NOT NULL DEFAULT 0,
    "minDistanceFixedPrice" INTEGER NOT NULL DEFAULT 0,
    "maxDeliveryRadiusKm" DOUBLE PRECISION NOT NULL DEFAULT 1500,
    "driverSearchRadiusKm" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "driverSearchRadiusStepKm" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "driverSearchRadiusMaxKm" DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    "autoCancelPendingMins" INTEGER NOT NULL DEFAULT 15,
    "driverAcceptTimeoutSecs" INTEGER NOT NULL DEFAULT 30,
    "isMaintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "androidMinVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "androidLatestVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "androidForceUpdate" BOOLEAN NOT NULL DEFAULT false,
    "androidStoreUrl" TEXT,
    "iosMinVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "iosLatestVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "iosForceUpdate" BOOLEAN NOT NULL DEFAULT false,
    "iosStoreUrl" TEXT,
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "supportWhatsapp" TEXT,
    "termsUrl" TEXT,
    "privacyUrl" TEXT,
    "homeCoverUrl" TEXT,
    "motorcycleIconUrl" TEXT,
    "carIconUrl" TEXT,
    "deliveryBannerIconUrl" TEXT,
    "retentionOrdersDays" INTEGER NOT NULL DEFAULT 90,
    "retentionArchivedChatsDays" INTEGER NOT NULL DEFAULT 60,
    "retentionNotificationsDays" INTEGER NOT NULL DEFAULT 30,
    "retentionExpiredSessionsDays" INTEGER NOT NULL DEFAULT 7,
    "retentionAuditLogsDays" INTEGER NOT NULL DEFAULT 180,
    "retentionAbandonedCartsDays" INTEGER NOT NULL DEFAULT 7,
    "retentionWalletTransactionsDays" INTEGER NOT NULL DEFAULT 365,
    "retentionStatisticsDays" INTEGER NOT NULL DEFAULT 365,
    "maxKmForBicycle" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "driverSearchMaxAttempts" INTEGER NOT NULL DEFAULT 5,
    "fallbackOrderDistanceKm" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "customOrderPlatformFee" INTEGER NOT NULL DEFAULT 10,
    "maxDispatchBatchSize" INTEGER NOT NULL DEFAULT 300,
    "coinValue" INTEGER NOT NULL DEFAULT 1,
    "amountSpentPerCoin" INTEGER NOT NULL DEFAULT 10,
    "minCoinsToUse" INTEGER NOT NULL DEFAULT 1,
    "driverBonusActive" BOOLEAN NOT NULL DEFAULT false,
    "driverBonusAmount" INTEGER NOT NULL DEFAULT 0,
    "driverBonusStartDate" TIMESTAMPTZ(3),
    "driverBonusEndDate" TIMESTAMPTZ(3),
    "driverBonusPaidByCustomer" BOOLEAN NOT NULL DEFAULT false,
    "driverShiftsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "customerApprovalTimeoutSecs" INTEGER NOT NULL DEFAULT 60,
    "maxActiveOrdersPerCustomer" INTEGER NOT NULL DEFAULT 2,
    "requirePriorDeliveryForMultipleOrders" BOOLEAN NOT NULL DEFAULT true,
    "maxOtpAttempts" INTEGER NOT NULL DEFAULT 5,
    "maxNegativeDriverBalance" INTEGER NOT NULL DEFAULT 500,
    "otpExpirySeconds" INTEGER NOT NULL DEFAULT 900,
    "bronzeTierBonusPerKm" INTEGER NOT NULL DEFAULT 0,
    "silverTierBonusPerKm" INTEGER NOT NULL DEFAULT 0,
    "goldTierBonusPerKm" INTEGER NOT NULL DEFAULT 0,
    "highValueOrderThreshold" INTEGER NOT NULL DEFAULT 0,
    "highValueUpfrontRate" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "boundary" geometry NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "baseDeliveryFeeOverride" INTEGER,
    "minOrderAmountOverride" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "title" TEXT,
    "titleAr" TEXT,
    "permissions" "Permission"[],
    "avatar" TEXT,
    "language" "Language" NOT NULL DEFAULT 'EN',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "autoReplyMessage" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "userId" TEXT NOT NULL,
    "lastActive" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hashedRt" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "body" TEXT,
    "bodyAr" TEXT,
    "type" "NotificationType" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "orderUpdates" BOOLEAN NOT NULL DEFAULT true,
    "chatMessages" BOOLEAN NOT NULL DEFAULT true,
    "promotions" BOOLEAN NOT NULL DEFAULT true,
    "system" BOOLEAN NOT NULL DEFAULT true,
    "ticketUpdates" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL DEFAULT 'ORDER',
    "orderId" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "vendorId" TEXT,
    "creatorId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversationId","userId")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "text" TEXT,
    "mediaUrl" TEXT,
    "metadata" JSONB,
    "replyToId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL DEFAULT 'TKT-'::text || nextval('ticket_number_seq'::regclass),
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "category" "TicketCategory" NOT NULL DEFAULT 'OTHER',
    "subCategory" TEXT,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "creatorId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "orderId" TEXT,
    "vendorId" TEXT,
    "conversationId" TEXT,
    "lastStatusUpdateAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "escalatedAt" TIMESTAMPTZ(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canOrder" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "coinBalance" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_coin_transactions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "CoinTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_coin_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_vendors" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_products" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Home',
    "address" TEXT NOT NULL,
    "location" geometry NOT NULL,
    "details" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_verticals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "slug" TEXT NOT NULL,
    "iconUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vendor_verticals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "storeNameAr" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "descriptionAr" TEXT,
    "logo" TEXT,
    "coverImage" TEXT,
    "phone" TEXT,
    "taxId" TEXT,
    "commissionRate" INTEGER NOT NULL DEFAULT 10,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "status" "VendorStatus" NOT NULL DEFAULT 'CLOSED',
    "walletBalance" INTEGER NOT NULL DEFAULT 0,
    "isContracted" BOOLEAN NOT NULL DEFAULT false,
    "workingHours" JSONB,
    "isScheduleActive" BOOLEAN NOT NULL DEFAULT true,
    "is24Hours" BOOLEAN NOT NULL DEFAULT false,
    "verticalId" TEXT NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_members" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "VendorMemberRole" NOT NULL DEFAULT 'STAFF',
    "branchId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "location" geometry NOT NULL,
    "vendorId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vendor_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_wallet_transactions" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "VendorTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_statistics" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "period" "StatisticPeriod" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" INTEGER NOT NULL DEFAULT 0,
    "totalCommission" INTEGER NOT NULL DEFAULT 0,
    "totalTax" INTEGER NOT NULL DEFAULT 0,
    "completedOrders" INTEGER NOT NULL DEFAULT 0,
    "cancelledOrders" INTEGER NOT NULL DEFAULT 0,
    "avgPrepTimeMins" DOUBLE PRECISION,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vendor_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_statistics" (
    "id" TEXT NOT NULL,
    "period" "StatisticPeriod" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalAdminRevenue" INTEGER NOT NULL DEFAULT 0,
    "totalDeliveryFees" INTEGER NOT NULL DEFAULT 0,
    "activeCustomers" INTEGER NOT NULL DEFAULT 0,
    "activeDrivers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "app_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_categories" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "description" TEXT,
    "descriptionAr" TEXT,
    "iconUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 100,
    "vendorId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "description" TEXT,
    "descriptionAr" TEXT,
    "imageUrl" TEXT,
    "sellByStrip" BOOLEAN NOT NULL DEFAULT false,
    "stripsPerPackage" INTEGER,
    "hasVariants" BOOLEAN NOT NULL DEFAULT false,
    "basePrice" INTEGER,
    "comparePrice" INTEGER,
    "sku" TEXT,
    "stock" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "sku" TEXT,
    "basePrice" INTEGER NOT NULL,
    "comparePrice" INTEGER,
    "stock" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_option_groups" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "minSelect" INTEGER NOT NULL DEFAULT 0,
    "maxSelect" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "product_option_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_options" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "priceAdded" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "product_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "customName" TEXT,
    "customPrice" INTEGER,
    "customImageUrl" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "specialRequest" TEXT,
    "optionHash" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_item_options" (
    "id" TEXT NOT NULL,
    "cartItemId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "cart_item_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL DEFAULT 'ORD-'::text || nextval('order_number_seq'::regclass),
    "type" "OrderType" NOT NULL DEFAULT 'STANDARD',
    "customerId" TEXT NOT NULL,
    "vendorId" TEXT,
    "vendorBranchId" TEXT,
    "driverId" TEXT,
    "zoneId" TEXT,
    "driverShiftId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "deliveryAddress" TEXT NOT NULL,
    "deliveryLocation" geometry NOT NULL,
    "pickupAddress" TEXT,
    "pickupLocation" geometry,
    "itemDetails" TEXT,
    "requestedVehicleType" "VehicleType",
    "subtotal" INTEGER NOT NULL,
    "deliveryFee" INTEGER NOT NULL,
    "driverBonusFee" INTEGER NOT NULL DEFAULT 0,
    "serviceFee" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "coinsUsed" INTEGER NOT NULL DEFAULT 0,
    "coinsEarned" INTEGER NOT NULL DEFAULT 0,
    "grandTotal" INTEGER NOT NULL,
    "upfrontAmount" INTEGER NOT NULL DEFAULT 0,
    "specialRequest" TEXT,
    "estimatedPrepTime" INTEGER,
    "distanceKm" DOUBLE PRECISION,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3),
    "preparedAt" TIMESTAMPTZ(3),
    "driverAssignedAt" TIMESTAMPTZ(3),
    "pickedUpAt" TIMESTAMPTZ(3),
    "actualDeliveryTime" TIMESTAMPTZ(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_events" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "variantName" TEXT,
    "unitPrice" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "specialRequest" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_options" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "optionId" TEXT,
    "optionName" TEXT NOT NULL,
    "priceAdded" INTEGER NOT NULL,

    CONSTRAINT "order_item_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "nationalId" TEXT,
    "licenseNumber" TEXT,
    "vehicleType" "VehicleType" NOT NULL DEFAULT 'MOTORCYCLE',
    "vehiclePlate" TEXT,
    "tier" "DriverTier" NOT NULL DEFAULT 'GOLD',
    "status" "DriverStatus" NOT NULL DEFAULT 'OFFLINE',
    "lastLocation" geometry,
    "lastLocationUpdate" TIMESTAMPTZ(3),
    "rating" INTEGER NOT NULL DEFAULT 500,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMPTZ(3),
    "approvedById" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "walletBalance" INTEGER NOT NULL DEFAULT 0,
    "hasUnpaidCommission" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 100,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_shifts" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "shiftPoolId" TEXT,
    "zoneId" TEXT,
    "shiftDate" TIMESTAMPTZ(3) NOT NULL,
    "startTime" TIMESTAMPTZ(3) NOT NULL,
    "endTime" TIMESTAMPTZ(3) NOT NULL,
    "actualStart" TIMESTAMPTZ(3),
    "actualEnd" TIMESTAMPTZ(3),
    "startingLocation" geometry,
    "endingLocation" geometry,
    "status" "DriverShiftStatus" NOT NULL DEFAULT 'SCHEDULED',
    "breakMinutes" INTEGER,
    "totalEarnings" INTEGER,
    "totalDeliveries" INTEGER,
    "expiredDispatches" INTEGER NOT NULL DEFAULT 0,
    "rejectedDispatches" INTEGER NOT NULL DEFAULT 0,
    "warningSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_pools" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT,
    "shiftDate" DATE NOT NULL,
    "startTime" TIMESTAMPTZ(3) NOT NULL,
    "endTime" TIMESTAMPTZ(3) NOT NULL,
    "maxDrivers" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shift_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_swap_requests" (
    "id" TEXT NOT NULL,
    "driverShiftId" TEXT NOT NULL,
    "offeredByDriverId" TEXT NOT NULL,
    "status" "SwapRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shift_swap_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_wallet_transactions" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "orderId" TEXT,
    "driverShiftId" TEXT,
    "type" "WalletTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_statistics" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "period" "StatisticPeriod" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" INTEGER NOT NULL DEFAULT 0,
    "completedOrders" INTEGER NOT NULL DEFAULT 0,
    "cancelledOrders" INTEGER NOT NULL DEFAULT 0,
    "onlineHours" DOUBLE PRECISION,
    "totalDispatchesReceived" INTEGER NOT NULL DEFAULT 0,
    "dispatchesAccepted" INTEGER NOT NULL DEFAULT 0,
    "dispatchesRejected" INTEGER NOT NULL DEFAULT 0,
    "dispatchesExpired" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "driver_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_dispatches" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "driverShiftId" TEXT,
    "type" "OrderType" NOT NULL DEFAULT 'STANDARD',
    "status" "DispatchStatus" NOT NULL DEFAULT 'PENDING',
    "distanceKm" DOUBLE PRECISION,
    "estimatedEarnings" INTEGER,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "order_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vendorId" TEXT,
    "actionType" "AuditActionType" NOT NULL DEFAULT 'OTHER',
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "description" TEXT,
    "descriptionAr" TEXT,
    "imageUrl" TEXT NOT NULL,
    "type" "PromotionType" NOT NULL DEFAULT 'BANNER',
    "vendorId" TEXT,
    "productId" TEXT,
    "externalUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMPTZ(3),
    "endDate" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_offers" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "originalPrice" INTEGER NOT NULL,
    "offerPrice" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMPTZ(3),
    "endDate" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_wallets" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "type" "WalletType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPlatform" BOOLEAN NOT NULL DEFAULT false,
    "driverId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mobile_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_top_up_requests" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "platformWalletId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "receiptUrl" TEXT NOT NULL,
    "status" "TopUpStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "wallet_top_up_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "zones_isActive_idx" ON "zones"("isActive");

-- CreateIndex
CREATE INDEX "zones_boundary_idx" ON "zones" USING GIST ("boundary");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "devices_token_key" ON "devices"("token");

-- CreateIndex
CREATE INDEX "devices_userId_platform_idx" ON "devices"("userId", "platform");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_type_idx" ON "notifications"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_userId_key" ON "notification_settings"("userId");

-- CreateIndex
CREATE INDEX "conversations_orderId_idx" ON "conversations"("orderId");

-- CreateIndex
CREATE INDEX "conversations_vendorId_idx" ON "conversations"("vendorId");

-- CreateIndex
CREATE INDEX "conversations_creatorId_idx" ON "conversations"("creatorId");

-- CreateIndex
CREATE INDEX "conversations_createdAt_idx" ON "conversations"("createdAt");

-- CreateIndex
CREATE INDEX "conversations_updatedAt_idx" ON "conversations"("updatedAt");

-- CreateIndex
CREATE INDEX "conversation_participants_userId_idx" ON "conversation_participants"("userId");

-- CreateIndex
CREATE INDEX "conversation_participants_lastReadAt_idx" ON "conversation_participants"("lastReadAt");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE INDEX "messages_replyToId_idx" ON "messages"("replyToId");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticketNumber_key" ON "support_tickets"("ticketNumber");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_conversationId_key" ON "support_tickets"("conversationId");

-- CreateIndex
CREATE INDEX "support_tickets_creatorId_idx" ON "support_tickets"("creatorId");

-- CreateIndex
CREATE INDEX "support_tickets_assigneeId_idx" ON "support_tickets"("assigneeId");

-- CreateIndex
CREATE INDEX "support_tickets_vendorId_idx" ON "support_tickets"("vendorId");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_tickets_orderId_idx" ON "support_tickets"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_userId_key" ON "customers"("userId");

-- CreateIndex
CREATE INDEX "customers_createdAt_idx" ON "customers"("createdAt");

-- CreateIndex
CREATE INDEX "customers_deletedAt_idx" ON "customers"("deletedAt");

-- CreateIndex
CREATE INDEX "customer_coin_transactions_customerId_idx" ON "customer_coin_transactions"("customerId");

-- CreateIndex
CREATE INDEX "customer_coin_transactions_orderId_idx" ON "customer_coin_transactions"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_vendors_customerId_vendorId_key" ON "favorite_vendors"("customerId", "vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_products_customerId_productId_key" ON "favorite_products"("customerId", "productId");

-- CreateIndex
CREATE INDEX "addresses_customerId_idx" ON "addresses"("customerId");

-- CreateIndex
CREATE INDEX "addresses_location_idx" ON "addresses" USING GIST ("location");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_verticals_slug_key" ON "vendor_verticals"("slug");

-- CreateIndex
CREATE INDEX "vendor_verticals_isActive_sortOrder_idx" ON "vendor_verticals"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_slug_key" ON "vendors"("slug");

-- CreateIndex
CREATE INDEX "vendors_createdAt_idx" ON "vendors"("createdAt");

-- CreateIndex
CREATE INDEX "vendors_status_idx" ON "vendors"("status");

-- CreateIndex
CREATE INDEX "vendors_verticalId_idx" ON "vendors"("verticalId");

-- CreateIndex
CREATE INDEX "vendors_deletedAt_idx" ON "vendors"("deletedAt");

-- CreateIndex
CREATE INDEX "vendor_members_userId_idx" ON "vendor_members"("userId");

-- CreateIndex
CREATE INDEX "vendor_members_branchId_idx" ON "vendor_members"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_members_vendorId_userId_key" ON "vendor_members"("vendorId", "userId");

-- CreateIndex
CREATE INDEX "vendor_branches_zoneId_idx" ON "vendor_branches"("zoneId");

-- CreateIndex
CREATE INDEX "vendor_branches_vendorId_isOpen_idx" ON "vendor_branches"("vendorId", "isOpen");

-- CreateIndex
CREATE INDEX "vendor_branches_location_idx" ON "vendor_branches" USING GIST ("location");

-- CreateIndex
CREATE INDEX "vendor_wallet_transactions_vendorId_idx" ON "vendor_wallet_transactions"("vendorId");

-- CreateIndex
CREATE INDEX "vendor_wallet_transactions_orderId_idx" ON "vendor_wallet_transactions"("orderId");

-- CreateIndex
CREATE INDEX "vendor_wallet_transactions_createdAt_idx" ON "vendor_wallet_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "vendor_statistics_startDate_endDate_idx" ON "vendor_statistics"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_statistics_vendorId_period_startDate_key" ON "vendor_statistics"("vendorId", "period", "startDate");

-- CreateIndex
CREATE INDEX "app_statistics_startDate_endDate_idx" ON "app_statistics"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "app_statistics_period_startDate_key" ON "app_statistics"("period", "startDate");

-- CreateIndex
CREATE INDEX "menu_categories_vendorId_isActive_idx" ON "menu_categories"("vendorId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_vendorId_isActive_isFeatured_idx" ON "products"("vendorId", "isActive", "isFeatured");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_deletedAt_idx" ON "products"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_productId_isActive_idx" ON "product_variants"("productId", "isActive");

-- CreateIndex
CREATE INDEX "product_option_groups_productId_idx" ON "product_option_groups"("productId");

-- CreateIndex
CREATE INDEX "product_option_groups_variantId_idx" ON "product_option_groups"("variantId");

-- CreateIndex
CREATE INDEX "product_options_groupId_idx" ON "product_options"("groupId");

-- CreateIndex
CREATE INDEX "carts_customerId_idx" ON "carts"("customerId");

-- CreateIndex
CREATE INDEX "carts_updatedAt_idx" ON "carts"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "carts_customerId_vendorId_key" ON "carts"("customerId", "vendorId");

-- CreateIndex
CREATE INDEX "cart_item_options_cartItemId_idx" ON "cart_item_options"("cartItemId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_customerId_idx" ON "orders"("customerId");

-- CreateIndex
CREATE INDEX "orders_zoneId_idx" ON "orders"("zoneId");

-- CreateIndex
CREATE INDEX "orders_vendorId_status_idx" ON "orders"("vendorId", "status");

-- CreateIndex
CREATE INDEX "orders_driverId_idx" ON "orders"("driverId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_deletedAt_idx" ON "orders"("deletedAt");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "orders_deliveryLocation_idx" ON "orders" USING GIST ("deliveryLocation");

-- CreateIndex
CREATE INDEX "order_status_events_orderId_createdAt_idx" ON "order_status_events"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_item_options_orderItemId_idx" ON "order_item_options"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_userId_key" ON "drivers"("userId");

-- CreateIndex
CREATE INDEX "drivers_status_idx" ON "drivers"("status");

-- CreateIndex
CREATE INDEX "drivers_createdAt_idx" ON "drivers"("createdAt");

-- CreateIndex
CREATE INDEX "drivers_deletedAt_idx" ON "drivers"("deletedAt");

-- CreateIndex
CREATE INDEX "driver_shifts_shiftPoolId_idx" ON "driver_shifts"("shiftPoolId");

-- CreateIndex
CREATE INDEX "driver_shifts_zoneId_idx" ON "driver_shifts"("zoneId");

-- CreateIndex
CREATE INDEX "driver_shifts_driverId_status_idx" ON "driver_shifts"("driverId", "status");

-- CreateIndex
CREATE INDEX "driver_shifts_shiftDate_idx" ON "driver_shifts"("shiftDate");

-- CreateIndex
CREATE INDEX "driver_shifts_status_idx" ON "driver_shifts"("status");

-- CreateIndex
CREATE INDEX "driver_shifts_startingLocation_idx" ON "driver_shifts" USING GIST ("startingLocation");

-- CreateIndex
CREATE INDEX "driver_shifts_endingLocation_idx" ON "driver_shifts" USING GIST ("endingLocation");

-- CreateIndex
CREATE INDEX "shift_pools_shiftDate_idx" ON "shift_pools"("shiftDate");

-- CreateIndex
CREATE INDEX "shift_pools_zoneId_idx" ON "shift_pools"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "shift_swap_requests_driverShiftId_key" ON "shift_swap_requests"("driverShiftId");

-- CreateIndex
CREATE INDEX "shift_swap_requests_status_idx" ON "shift_swap_requests"("status");

-- CreateIndex
CREATE INDEX "shift_swap_requests_offeredByDriverId_idx" ON "shift_swap_requests"("offeredByDriverId");

-- CreateIndex
CREATE INDEX "driver_wallet_transactions_driverId_idx" ON "driver_wallet_transactions"("driverId");

-- CreateIndex
CREATE INDEX "driver_wallet_transactions_orderId_idx" ON "driver_wallet_transactions"("orderId");

-- CreateIndex
CREATE INDEX "driver_wallet_transactions_createdAt_idx" ON "driver_wallet_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "driver_wallet_transactions_driverShiftId_idx" ON "driver_wallet_transactions"("driverShiftId");

-- CreateIndex
CREATE INDEX "driver_statistics_startDate_endDate_idx" ON "driver_statistics"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "driver_statistics_driverId_period_startDate_key" ON "driver_statistics"("driverId", "period", "startDate");

-- CreateIndex
CREATE INDEX "order_dispatches_orderId_idx" ON "order_dispatches"("orderId");

-- CreateIndex
CREATE INDEX "order_dispatches_driverId_idx" ON "order_dispatches"("driverId");

-- CreateIndex
CREATE INDEX "order_dispatches_driverShiftId_idx" ON "order_dispatches"("driverShiftId");

-- CreateIndex
CREATE INDEX "order_dispatches_status_idx" ON "order_dispatches"("status");

-- CreateIndex
CREATE INDEX "order_dispatches_createdAt_idx" ON "order_dispatches"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_vendorId_idx" ON "audit_logs"("vendorId");

-- CreateIndex
CREATE INDEX "audit_logs_actionType_idx" ON "audit_logs"("actionType");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_sessionId_idx" ON "audit_logs"("sessionId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "promotions_isActive_sortOrder_idx" ON "promotions"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "product_offers_isActive_sortOrder_idx" ON "product_offers"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "mobile_wallets_driverId_idx" ON "mobile_wallets"("driverId");

-- CreateIndex
CREATE INDEX "wallet_top_up_requests_driverId_idx" ON "wallet_top_up_requests"("driverId");

-- CreateIndex
CREATE INDEX "wallet_top_up_requests_platformWalletId_idx" ON "wallet_top_up_requests"("platformWalletId");

-- CreateIndex
CREATE INDEX "wallet_top_up_requests_approvedById_idx" ON "wallet_top_up_requests"("approvedById");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_coin_transactions" ADD CONSTRAINT "customer_coin_transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_vendors" ADD CONSTRAINT "favorite_vendors_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_vendors" ADD CONSTRAINT "favorite_vendors_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_products" ADD CONSTRAINT "favorite_products_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_products" ADD CONSTRAINT "favorite_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_verticalId_fkey" FOREIGN KEY ("verticalId") REFERENCES "vendor_verticals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_members" ADD CONSTRAINT "vendor_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_members" ADD CONSTRAINT "vendor_members_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_members" ADD CONSTRAINT "vendor_members_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "vendor_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_branches" ADD CONSTRAINT "vendor_branches_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_branches" ADD CONSTRAINT "vendor_branches_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_wallet_transactions" ADD CONSTRAINT "vendor_wallet_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_wallet_transactions" ADD CONSTRAINT "vendor_wallet_transactions_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_statistics" ADD CONSTRAINT "vendor_statistics_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "menu_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_option_groups" ADD CONSTRAINT "product_option_groups_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_option_groups" ADD CONSTRAINT "product_option_groups_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "product_option_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item_options" ADD CONSTRAINT "cart_item_options_cartItemId_fkey" FOREIGN KEY ("cartItemId") REFERENCES "cart_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item_options" ADD CONSTRAINT "cart_item_options_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "product_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_driverShiftId_fkey" FOREIGN KEY ("driverShiftId") REFERENCES "driver_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_vendorBranchId_fkey" FOREIGN KEY ("vendorBranchId") REFERENCES "vendor_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_options" ADD CONSTRAINT "order_item_options_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "product_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_options" ADD CONSTRAINT "order_item_options_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_shifts" ADD CONSTRAINT "driver_shifts_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_shifts" ADD CONSTRAINT "driver_shifts_shiftPoolId_fkey" FOREIGN KEY ("shiftPoolId") REFERENCES "shift_pools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_shifts" ADD CONSTRAINT "driver_shifts_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_pools" ADD CONSTRAINT "shift_pools_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_driverShiftId_fkey" FOREIGN KEY ("driverShiftId") REFERENCES "driver_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_wallet_transactions" ADD CONSTRAINT "driver_wallet_transactions_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_wallet_transactions" ADD CONSTRAINT "driver_wallet_transactions_driverShiftId_fkey" FOREIGN KEY ("driverShiftId") REFERENCES "driver_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_wallet_transactions" ADD CONSTRAINT "driver_wallet_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_statistics" ADD CONSTRAINT "driver_statistics_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_dispatches" ADD CONSTRAINT "order_dispatches_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_dispatches" ADD CONSTRAINT "order_dispatches_driverShiftId_fkey" FOREIGN KEY ("driverShiftId") REFERENCES "driver_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_dispatches" ADD CONSTRAINT "order_dispatches_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_offers" ADD CONSTRAINT "product_offers_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_offers" ADD CONSTRAINT "product_offers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_wallets" ADD CONSTRAINT "mobile_wallets_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_top_up_requests" ADD CONSTRAINT "wallet_top_up_requests_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_top_up_requests" ADD CONSTRAINT "wallet_top_up_requests_platformWalletId_fkey" FOREIGN KEY ("platformWalletId") REFERENCES "mobile_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- CreateTable
CREATE TABLE "order_reviews" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vendorId" TEXT,
    "driverId" TEXT,
    "vendorRating" DOUBLE PRECISION,
    "driverRating" DOUBLE PRECISION,
    "comment" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_reviews_orderId_key" ON "order_reviews"("orderId");
CREATE INDEX "order_reviews_vendorId_idx" ON "order_reviews"("vendorId");
CREATE INDEX "order_reviews_driverId_idx" ON "order_reviews"("driverId");
CREATE INDEX "order_reviews_customerId_idx" ON "order_reviews"("customerId");

-- AddForeignKey
ALTER TABLE "order_reviews" ADD CONSTRAINT "order_reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_reviews" ADD CONSTRAINT "order_reviews_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_reviews" ADD CONSTRAINT "order_reviews_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_reviews" ADD CONSTRAINT "order_reviews_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
