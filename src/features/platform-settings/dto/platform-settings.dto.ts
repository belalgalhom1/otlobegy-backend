import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsInt,
  IsPositive,
  Min,
  MaxLength,
  IsUrl,
  IsEmail,
  IsDateString,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePlatformSettingsDto {
  // ─── Financial ─────────────────────────────────────────────────────────────
  @ApiProperty({ example: 'EGP', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;

  @ApiProperty({ example: 0.1, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  defaultCommissionRate?: number;

  @ApiProperty({ example: 20, required: false })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  deliveryCommissionRate?: number;

  @ApiProperty({ example: 10, required: false })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  customOrderPlatformFee?: number;

  @ApiProperty({ example: 14, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  defaultTaxRate?: number;

  @ApiProperty({ example: 50, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minOrderAmount?: number;

  // ─── Delivery ──────────────────────────────────────────────────────────────
  @ApiProperty({ example: 10, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  baseDeliveryFee?: number;

  @ApiProperty({ example: 2, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  pricePerKm?: number;

  @ApiProperty({ example: 2, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  pricePerKmBicycle?: number;

  @ApiProperty({ example: 3, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  pricePerKmMotorcycle?: number;

  @ApiProperty({ example: 5, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  pricePerKmCar?: number;

  @ApiProperty({ example: 8, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  pricePerKmVan?: number;

  @ApiProperty({ example: 12, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  pricePerKmTruck?: number;

  @ApiProperty({ example: 4, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  pricePerKmMotorTricycle?: number;

  @ApiProperty({ example: 0, required: false, description: 'Max limit on delivery fee' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxDeliveryFee?: number;

  @ApiProperty({ example: 15, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minDeliveryFeeBicycle?: number;

  @ApiProperty({ example: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxDeliveryFeeBicycle?: number;

  @ApiProperty({ example: 15, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minDeliveryFeeMotorcycle?: number;

  @ApiProperty({ example: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxDeliveryFeeMotorcycle?: number;

  @ApiProperty({ example: 15, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minDeliveryFeeCar?: number;

  @ApiProperty({ example: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxDeliveryFeeCar?: number;

  @ApiProperty({ example: 15, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minDeliveryFeeVan?: number;

  @ApiProperty({ example: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxDeliveryFeeVan?: number;

  @ApiProperty({ example: 15, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minDeliveryFeeTruck?: number;

  @ApiProperty({ example: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxDeliveryFeeTruck?: number;

  @ApiProperty({ example: 15, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minDeliveryFeeMotorTricycle?: number;

  @ApiProperty({ example: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxDeliveryFeeMotorTricycle?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  allowBicycle?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  allowMotorcycle?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  allowCar?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  allowVan?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  allowTruck?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  allowMotorTricycle?: boolean;

  @ApiProperty({ example: 0, required: false, description: 'Distance below which fixed price is applied' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minOrderKm?: number;

  @ApiProperty({ example: 0, required: false, description: 'Fixed price applied if distance is below minOrderKm' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minDistanceFixedPrice?: number;

  @ApiProperty({ example: 15, required: false })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  maxDeliveryRadiusKm?: number;

  @ApiProperty({ example: 5, required: false })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  driverSearchRadiusKm?: number;

  @ApiProperty({ example: 2, required: false })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  driverSearchRadiusStepKm?: number;

  @ApiProperty({ example: 15, required: false })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  driverSearchRadiusMaxKm?: number;

  @ApiProperty({ example: 5, required: false })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  driverSearchMaxAttempts?: number;

  @ApiProperty({ example: 3, required: false })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  fallbackOrderDistanceKm?: number;

  // ─── Order behaviour ───────────────────────────────────────────────────────

  @ApiProperty({ example: 1500, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  autoCancelPendingMins?: number;

  @ApiProperty({ example: 60, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  driverAcceptTimeoutSecs?: number;

  @ApiProperty({ example: 3, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  maxDispatchBatchSize?: number;

  // ─── Maintenance ───────────────────────────────────────────────────────────
  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isMaintenanceMode?: boolean;

  // ─── Android app ──────────────────────────────────────────────────────────
  @ApiProperty({ example: '1.0.0', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  androidMinVersion?: string;

  @ApiProperty({ example: '1.1.0', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  androidLatestVersion?: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  androidForceUpdate?: boolean;

  @ApiProperty({
    example: 'https://play.google.com/store/apps/details?id=com.otlobegy',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  androidStoreUrl?: string;

  // ─── iOS app ──────────────────────────────────────────────────────────────
  @ApiProperty({ example: '1.0.0', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  iosMinVersion?: string;

  @ApiProperty({ example: '1.1.0', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  iosLatestVersion?: string;



  @ApiProperty({ example: 60, required: false, description: 'Seconds customer has to approve exact delivery fee' })
  @IsInt()
  @Min(10)
  @IsOptional()
  @Type(() => Number)
  customerApprovalTimeoutSecs?: number;

  @ApiProperty({ example: 2, required: false, description: 'Max active orders a customer can have' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  maxActiveOrdersPerCustomer?: number;

  @ApiProperty({ example: true, required: false, description: 'Requires prior delivery to place multiple orders' })
  @IsBoolean()
  @IsOptional()
  requirePriorDeliveryForMultipleOrders?: boolean;

  @ApiProperty({ example: 5, required: false, description: 'Max OTP attempts before block' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  maxOtpAttempts?: number;

  @ApiProperty({ example: 900, required: false, description: 'OTP expiry in seconds' })
  @IsInt()
  @Min(60)
  @IsOptional()
  @Type(() => Number)
  otpExpirySeconds?: number;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  iosForceUpdate?: boolean;

  @ApiProperty({
    example: 'https://apps.apple.com/app/otlobegy',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  iosStoreUrl?: string;

  // ─── Support contact ──────────────────────────────────────────────────────
  @ApiProperty({ example: 'support@otlobegy.com', required: false })
  @IsEmail()
  @IsOptional()
  supportEmail?: string;

  @ApiProperty({ example: '+201234567890', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  supportPhone?: string;

  @ApiProperty({ example: '+201234567890', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  supportWhatsapp?: string;

  // ─── Legal ────────────────────────────────────────────────────────────────
  @ApiProperty({ example: 'https://otlobegy.com/terms', required: false })
  @IsUrl()
  @IsOptional()
  termsUrl?: string;

  @ApiProperty({ example: 'https://otlobegy.com/privacy', required: false })
  @IsUrl()
  @IsOptional()
  privacyUrl?: string;

  // ─── Retention / Cleanup (days) ─────────────────────────────────────────────
  @ApiProperty({
    example: 90,
    required: false,
    description: 'Days before all old orders are hard-deleted',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  retentionOrdersDays?: number;

  @ApiProperty({
    example: 60,
    required: false,
    description: 'Days before archived conversations are hard-deleted',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  retentionArchivedChatsDays?: number;

  @ApiProperty({
    example: 30,
    required: false,
    description: 'Days before old notifications are hard-deleted',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  retentionNotificationsDays?: number;

  @ApiProperty({
    example: 7,
    required: false,
    description: 'Days after expiry before sessions are hard-deleted',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  retentionExpiredSessionsDays?: number;

  @ApiProperty({
    example: 180,
    required: false,
    description: 'Days before audit logs are hard-deleted',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  retentionAuditLogsDays?: number;

  @ApiProperty({
    example: 7,
    required: false,
    description: 'Days before abandoned carts are hard-deleted',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  retentionAbandonedCartsDays?: number;

  @ApiProperty({
    example: 365,
    required: false,
    description: 'Days before wallet transactions are hard-deleted',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  retentionWalletTransactionsDays?: number;

  @ApiProperty({
    example: 365,
    required: false,
    description: 'Days before statistics records are hard-deleted',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  retentionStatisticsDays?: number;

  @ApiProperty({
    example: 5,
    required: false,
    description: 'Max distance for bicycle dispatch',
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  maxKmForBicycle?: number;

  // ─── Coins ──────────────────────────────────────────────────────────────────
  @ApiProperty({
    example: 1,
    required: false,
    description: 'Value of 1 coin (e.g. 1 = 1 EGP)',
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  coinValue?: number;

  @ApiProperty({
    example: 10,
    required: false,
    description: 'Amount spent to earn 1 coin (e.g. 10 = 10 EGP)',
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  amountSpentPerCoin?: number;

  @ApiProperty({
    example: 100,
    required: false,
    description: 'Minimum coins required to use for partial payment',
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  minCoinsToUse?: number;

  // ─── Driver Bonus System ──────────────────────────────────────────────────
  @ApiProperty({
    example: false,
    required: false,
    description: 'Master switch for driver bonus',
  })
  @IsBoolean()
  @IsOptional()
  driverBonusActive?: boolean;

  @ApiProperty({
    example: 5,
    required: false,
    description: 'Bonus amount (e.g. 5 = 5 EGP)',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  driverBonusAmount?: number;

  @ApiProperty({
    example: '2026-12-01T00:00:00Z',
    required: false,
    description: 'Start date of the bonus period',
  })
  @IsDateString()
  @IsOptional()
  driverBonusStartDate?: Date;

  @ApiProperty({
    example: '2026-12-31T23:59:59Z',
    required: false,
    description: 'End date of the bonus period',
  })
  @IsDateString()
  @IsOptional()
  driverBonusEndDate?: Date;

  @ApiProperty({
    example: false,
    required: false,
    description:
      'If true, customer pays the bonus as a fee. If false, platform pays.',
  })
  @IsBoolean()
  @IsOptional()
  driverBonusPaidByCustomer?: boolean;

  // ─── High Value Orders ────────────────────────────────────────────────────
  @ApiProperty({
    example: 2000,
    required: false,
    description:
      'Threshold for high value orders (e.g. 2000 = 2000 EGP). 0 to disable.',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  highValueOrderThreshold?: number;

  @ApiProperty({
    example: 20,
    required: false,
    description:
      'Upfront percentage rate for high value cash orders (e.g. 20 = 20%)',
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  highValueUpfrontRate?: number;

  // ─── Driver Shifts & Tier Rewards ─────────────────────────────────────────
  @ApiProperty({
    example: false,
    required: false,
    description: 'Master switch for driver shifts feature',
  })
  @IsBoolean()
  @IsOptional()
  driverShiftsEnabled?: boolean;

  @ApiProperty({
    example: 1,
    required: false,
    description: 'Per-km bonus for Bronze tier drivers',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  bronzeTierBonusPerKm?: number;

  @ApiProperty({
    example: 2,
    required: false,
    description: 'Per-km bonus for Silver tier drivers',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  silverTierBonusPerKm?: number;

  @ApiProperty({
    example: 3,
    required: false,
    description: 'Per-km bonus for Gold tier drivers (Used at checkout)',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  goldTierBonusPerKm?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  requireCustomerApproval?: boolean;

  @ApiProperty({ example: 5, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  customerApprovalTimeoutMins?: number;
}

// Used by mobile clients to check app version requirements
export class AppVersionCheckDto {
  @ApiProperty({ enum: ['android', 'ios'] })
  @IsString()
  platform!: 'android' | 'ios';

  @ApiProperty({ example: '1.0.0' })
  @IsString()
  version!: string;
}

// ─── Public Projection ──────────────────────────────────────────────────────
export class PublicPlatformSettingsDto {
  @ApiProperty({ example: false })
  isMaintenanceMode: boolean;

  @ApiProperty({ example: 'EGP' })
  currency: string;

  @ApiProperty({ example: 50 })
  minOrderAmount: number;

  @ApiProperty({ example: 14 })
  defaultTaxRate: number;

  @ApiProperty({ example: 15 })
  baseDeliveryFee: number;

  @ApiProperty({ example: 0 })
  customOrderPlatformFee: number;

  @ApiProperty({ example: 3 })
  pricePerKm: number;

  @ApiProperty({ example: 2 })
  pricePerKmBicycle: number;

  @ApiProperty({ example: 3 })
  pricePerKmMotorcycle: number;

  @ApiProperty({ example: 5 })
  pricePerKmCar: number;

  @ApiProperty({ example: 8 })
  pricePerKmVan: number;

  @ApiProperty({ example: 12 })
  pricePerKmTruck: number;

  @ApiProperty({ example: 4 })
  pricePerKmMotorTricycle: number;

  @ApiProperty({ example: true })
  allowBicycle: boolean;

  @ApiProperty({ example: true })
  allowMotorcycle: boolean;

  @ApiProperty({ example: true })
  allowCar: boolean;

  @ApiProperty({ example: true })
  allowVan: boolean;

  @ApiProperty({ example: true })
  allowTruck: boolean;

  @ApiProperty({ example: true })
  allowMotorTricycle: boolean;

  @ApiProperty({ example: 1 })
  coinValue: number;

  @ApiProperty({ example: 10 })
  amountSpentPerCoin: number;

  @ApiProperty({ example: 1 })
  minCoinsToUse: number;

  @ApiProperty({ example: true })
  requireCustomerApproval: boolean;

  @ApiProperty({ example: 10 })
  customerApprovalTimeoutMins: number;

  @ApiProperty({ required: false })
  homeCoverUrl?: string;

  @ApiProperty({ required: false })
  motorcycleIconUrl?: string;

  @ApiProperty({ required: false })
  carIconUrl?: string;

  @ApiProperty({ required: false })
  deliveryBannerIconUrl?: string;

  @ApiProperty({
    example: {
      minVersion: '1.0.0',
      latestVersion: '1.0.0',
      forceUpdate: false,
      storeUrl: 'https://play.google.com/store/apps/details?id=com.otlob.customer',
    },
  })
  android: any;

  @ApiProperty({
    example: {
      minVersion: '1.0.0',
      latestVersion: '1.0.0',
      forceUpdate: false,
      storeUrl: 'https://apps.apple.com/app/id1234567890',
    },
  })
  ios: any;

  @ApiProperty({
    example: {
      email: 'support@otlob.com',
      phone: '+201000000000',
      whatsapp: '+201000000000',
    },
  })
  support: any;

  @ApiProperty({
    example: {
      termsUrl: 'https://otlob-egy.online/terms',
      privacyUrl: 'https://otlob-egy.online/privacy',
    },
  })
  legal: any;
}
