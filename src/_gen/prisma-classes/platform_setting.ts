import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlatformSetting {
  @ApiProperty({ type: String })
  id: string = 'default';

  @ApiProperty({ type: String })
  currency: string = 'EGP';

  @ApiProperty({ type: Number })
  defaultCommissionRate: number = 10;

  @ApiProperty({ type: Number })
  deliveryCommissionRate: number = 20;

  @ApiProperty({ type: Number })
  defaultTaxRate: number = 14;

  @ApiProperty({ type: Number })
  minOrderAmount: number;

  @ApiProperty({ type: Number })
  baseDeliveryFee: number = 15;

  @ApiProperty({ type: Number })
  pricePerKm: number = 3;

  @ApiProperty({ type: Number })
  pricePerKmBicycle: number = 2;

  @ApiProperty({ type: Number })
  pricePerKmMotorcycle: number = 3;

  @ApiProperty({ type: Number })
  pricePerKmCar: number = 5;

  @ApiProperty({ type: Number })
  pricePerKmVan: number = 8;

  @ApiProperty({ type: Number })
  pricePerKmTruck: number = 12;

  @ApiProperty({ type: Number })
  pricePerKmMotorTricycle: number = 4;

  @ApiProperty({ type: Number })
  maxDeliveryFee: number;

  @ApiProperty({ type: Number })
  minDeliveryFeeBicycle: number = 15;

  @ApiProperty({ type: Number })
  maxDeliveryFeeBicycle: number;

  @ApiProperty({ type: Number })
  minDeliveryFeeMotorcycle: number = 15;

  @ApiProperty({ type: Number })
  maxDeliveryFeeMotorcycle: number;

  @ApiProperty({ type: Number })
  minDeliveryFeeCar: number = 15;

  @ApiProperty({ type: Boolean })
  requireCustomerApproval: boolean = true;

  @ApiProperty({ type: Number })
  customerApprovalTimeoutMins: number = 5;

  @ApiProperty({ type: Number })
  maxDeliveryFeeCar: number;

  @ApiProperty({ type: Number })
  minDeliveryFeeVan: number = 15;

  @ApiProperty({ type: Number })
  maxDeliveryFeeVan: number;

  @ApiProperty({ type: Number })
  minDeliveryFeeTruck: number = 15;

  @ApiProperty({ type: Number })
  maxDeliveryFeeTruck: number;

  @ApiProperty({ type: Number })
  minDeliveryFeeMotorTricycle: number = 15;

  @ApiProperty({ type: Number })
  maxDeliveryFeeMotorTricycle: number;

  @ApiProperty({ type: Boolean })
  allowBicycle: boolean = true;

  @ApiProperty({ type: Boolean })
  allowMotorcycle: boolean = true;

  @ApiProperty({ type: Boolean })
  allowCar: boolean = true;

  @ApiProperty({ type: Boolean })
  allowVan: boolean = true;

  @ApiProperty({ type: Boolean })
  allowTruck: boolean = true;

  @ApiProperty({ type: Boolean })
  allowMotorTricycle: boolean = true;

  @ApiProperty({ type: Number })
  minOrderKm: number;

  @ApiProperty({ type: Number })
  minDistanceFixedPrice: number;

  @ApiProperty({ type: Number })
  maxDeliveryRadiusKm: number = 1500;

  @ApiProperty({ type: Number })
  driverSearchRadiusKm: number = 5;

  @ApiProperty({ type: Number })
  driverSearchRadiusStepKm: number = 2;

  @ApiProperty({ type: Number })
  driverSearchRadiusMaxKm: number = 15;

  @ApiProperty({ type: Number })
  autoCancelPendingMins: number = 15;

  @ApiProperty({ type: Number })
  mobileWalletTimeoutMins: number = 15;

  @ApiProperty({ type: Number })
  driverAcceptTimeoutSecs: number = 30;

  @ApiProperty({ type: Boolean })
  isMaintenanceMode: boolean;

  @ApiProperty({ type: String })
  androidMinVersion: string = '1.0.0';

  @ApiProperty({ type: String })
  androidLatestVersion: string = '1.0.0';

  @ApiProperty({ type: Boolean })
  androidForceUpdate: boolean;

  @ApiPropertyOptional({ type: String })
  androidStoreUrl?: string;

  @ApiProperty({ type: String })
  iosMinVersion: string = '1.0.0';

  @ApiProperty({ type: String })
  iosLatestVersion: string = '1.0.0';

  @ApiProperty({ type: Boolean })
  iosForceUpdate: boolean;

  @ApiPropertyOptional({ type: String })
  iosStoreUrl?: string;

  @ApiPropertyOptional({ type: String })
  supportEmail?: string;

  @ApiPropertyOptional({ type: String })
  supportPhone?: string;

  @ApiPropertyOptional({ type: String })
  supportWhatsapp?: string;

  @ApiPropertyOptional({ type: String })
  termsUrl?: string;

  @ApiPropertyOptional({ type: String })
  privacyUrl?: string;

  @ApiPropertyOptional({ type: String })
  homeCoverUrl?: string;

  @ApiPropertyOptional({ type: String })
  motorcycleIconUrl?: string;

  @ApiPropertyOptional({ type: String })
  carIconUrl?: string;

  @ApiPropertyOptional({ type: String })
  deliveryBannerIconUrl?: string;

  @ApiProperty({ type: Number })
  retentionOrdersDays: number = 90;

  @ApiProperty({ type: Number })
  retentionArchivedChatsDays: number = 60;

  @ApiProperty({ type: Number })
  retentionNotificationsDays: number = 30;

  @ApiProperty({ type: Number })
  retentionExpiredSessionsDays: number = 7;

  @ApiProperty({ type: Number })
  retentionAuditLogsDays: number = 180;

  @ApiProperty({ type: Number })
  retentionAbandonedCartsDays: number = 7;

  @ApiProperty({ type: Number })
  retentionWalletTransactionsDays: number = 365;

  @ApiProperty({ type: Number })
  retentionStatisticsDays: number = 365;

  @ApiProperty({ type: Number })
  maxKmForBicycle: number = 5;

  @ApiProperty({ type: Number })
  driverSearchMaxAttempts: number = 5;

  @ApiProperty({ type: Number })
  fallbackOrderDistanceKm: number = 3;

  @ApiProperty({ type: Number })
  customOrderPlatformFee: number = 10;

  @ApiProperty({ type: Number })
  maxDispatchBatchSize: number = 300;

  @ApiProperty({ type: Number })
  coinValue: number = 1;

  @ApiProperty({ type: Number })
  amountSpentPerCoin: number = 10;

  @ApiProperty({ type: Number })
  minCoinsToUse: number = 1;

  @ApiProperty({ type: Boolean })
  driverBonusActive: boolean;

  @ApiProperty({ type: Number })
  driverBonusAmount: number;

  @ApiPropertyOptional({ type: Date })
  driverBonusStartDate?: Date;

  @ApiPropertyOptional({ type: Date })
  driverBonusEndDate?: Date;

  @ApiProperty({ type: Boolean })
  driverBonusPaidByCustomer: boolean;

  @ApiProperty({ type: Boolean })
  driverShiftsEnabled: boolean;

  @ApiProperty({ type: Number })
  customerApprovalTimeoutSecs: number = 60;

  @ApiProperty({ type: Number })
  maxActiveOrdersPerCustomer: number = 2;

  @ApiProperty({ type: Boolean })
  requirePriorDeliveryForMultipleOrders: boolean = true;

  @ApiProperty({ type: Number })
  maxOtpAttempts: number = 5;

  @ApiProperty({ type: Number })
  maxNegativeDriverBalance: number = 500;

  @ApiProperty({ type: Number })
  otpExpirySeconds: number = 900;

  @ApiProperty({ type: Number })
  bronzeTierBonusPerKm: number;

  @ApiProperty({ type: Number })
  silverTierBonusPerKm: number;

  @ApiProperty({ type: Number })
  goldTierBonusPerKm: number;

  @ApiProperty({ type: Number })
  highValueOrderThreshold: number;

  @ApiProperty({ type: Number })
  highValueUpfrontRate: number;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
