import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer'; // Added Transform here
import { Language, Permission, Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

// ─── Self-service DTOs ────────────────────────────────────────────────────────

export class UpdateUserDto {
  @ApiProperty({ example: 'John Doe', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 'user@example.com', required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '+201234567890', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ enum: Language, required: false })
  @IsEnum(Language)
  @IsOptional()
  language?: Language;

  @ApiProperty({
    example: 'Hello [customer name], how can I help you today?',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  autoReplyMessage?: string;
}

export class UpdateNotificationSettingsDto {
  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  pushEnabled?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  orderUpdates?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  chatMessages?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  promotions?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  system?: boolean;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'oldpassword123' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ example: 'newpassword123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  newPassword!: string;
}

export class BanUserDto {
  @ApiProperty({ example: 'Violating terms of service', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

// ─── Admin-only DTOs ──────────────────────────────────────────────────────────

export class QueryUsersDto {
  @ApiProperty({ enum: Role, required: false })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  // Explicitly transform the string "false" or "true" from URL to actual boolean
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isBanned?: boolean;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Include soft-deleted accounts',
  })
  @IsBoolean()
  @IsOptional()
  // Explicitly transform for the deleted accounts filter
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  includeDeleted?: boolean;

  @ApiProperty({ example: 'john', required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ example: 1, required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 20, required: false, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class AdminUpdateUserDto {
  @ApiProperty({ example: 'Jane Doe', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 'jane@example.com', required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '+201234567890', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ enum: Language, required: false })
  @IsEnum(Language)
  @IsOptional()
  language?: Language;

  @ApiProperty({ enum: Role, required: false })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiProperty({ example: 'Support Agent', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  title?: string;

  @ApiProperty({ example: 'وكيل دعم', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  titleAr?: string;

  @ApiProperty({
    enum: Permission,
    isArray: true,
    required: false,
    description: 'Replaces entire permissions array. Only for ADMIN role.',
  })
  @IsArray()
  @IsEnum(Permission, { each: true })
  @IsOptional()
  permissions?: Permission[];

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isEmailVerified?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isPhoneVerified?: boolean;

  @ApiProperty({ example: 'uuid', required: false })
  @IsString()
  @IsOptional()
  vendorId?: string;

  @ApiProperty({ enum: ['OWNER', 'MANAGER', 'STAFF'], required: false })
  @IsEnum(['OWNER', 'MANAGER', 'STAFF'])
  @IsOptional()
  vendorRole?: 'OWNER' | 'MANAGER' | 'STAFF';

  @ApiProperty({ example: 'newpassword123', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  password?: string;

  @ApiProperty({
    example: 'Hello [customer name], how can I help you today?',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  autoReplyMessage?: string;
}
