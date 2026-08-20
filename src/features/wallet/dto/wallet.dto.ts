import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsInt,
  Min,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { WalletType } from '@prisma/client';

export class CreateMobileWalletDto {
  @ApiProperty({ example: '01012345678' })
  @IsString()
  number!: string;

  @ApiProperty({ enum: WalletType })
  @IsEnum(WalletType)
  type!: WalletType;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateWalletTopUpDto {
  @ApiProperty({ example: 'wallet-uuid' })
  @IsString()
  platformWalletId!: string;

  @ApiProperty({ example: 5000 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ example: 'https://storage.com/receipt.jpg' })
  @IsUrl()
  receiptUrl!: string;
}

export class ReviewWalletTopUpDto {
  @ApiProperty({ example: 'APPROVED' })
  @IsEnum(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';
}

export class ProcessManualTransactionDto {
  @ApiProperty({ example: 5000, description: 'Positive or negative amount' })
  @IsInt()
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ example: 'PAYOUT', description: 'Type of transaction' })
  @IsString()
  type!: string;

  @ApiProperty({ example: 'Bank wire transfer #123456', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'order-123', required: false })
  @IsString()
  @IsOptional()
  referenceId?: string;
}
