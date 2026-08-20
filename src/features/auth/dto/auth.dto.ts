import {
  IsEmail,
  IsString,
  IsPhoneNumber,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  MinLength,
} from 'class-validator';
import { Language, Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { ValidationErrors } from '../../../common/constants/response.constants';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: ValidationErrors.EMAIL_INVALID })
  @IsNotEmpty({ message: ValidationErrors.EMAIL_REQUIRED })
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty({ message: ValidationErrors.PASSWORD_REQUIRED })
  password!: string;

  @ApiProperty({ example: 'customer', required: false })
  @IsString()
  @IsOptional()
  app?: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: ValidationErrors.EMAIL_INVALID })
  @IsNotEmpty({ message: ValidationErrors.EMAIL_REQUIRED })
  email!: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @IsNotEmpty({ message: ValidationErrors.PASSWORD_REQUIRED })
  @MinLength(6, { message: ValidationErrors.PASSWORD_WEAK })
  password!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty({ message: ValidationErrors.NAME_REQUIRED })
  name!: string;

  @ApiProperty({ example: '+201234567890', required: false })
  @IsPhoneNumber(undefined, { message: ValidationErrors.PHONE_INVALID })
  @IsOptional()
  phone?: string;

  @ApiProperty({ enum: Role, required: false })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiProperty({ example: 'uuid', required: false })
  @IsString()
  @IsOptional()
  vendorId?: string;

  @ApiProperty({ enum: ['OWNER', 'MANAGER', 'STAFF'], required: false })
  @IsEnum(['OWNER', 'MANAGER', 'STAFF'])
  @IsOptional()
  vendorRole?: 'OWNER' | 'MANAGER' | 'STAFF';
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  @IsNotEmpty({ message: ValidationErrors.CONTACT_REQUIRED })
  contact!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  @IsNotEmpty({ message: ValidationErrors.CONTACT_REQUIRED })
  contact!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty({ message: ValidationErrors.CODE_REQUIRED })
  code!: string;

  @ApiProperty({ example: 'newpassword123', minLength: 6 })
  @IsString()
  @IsNotEmpty({ message: ValidationErrors.PASSWORD_REQUIRED })
  @MinLength(6, { message: ValidationErrors.PASSWORD_WEAK })
  newPassword!: string;
}

export class SendOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  @IsNotEmpty({ message: ValidationErrors.CONTACT_REQUIRED })
  contact!: string;

  @ApiProperty({ enum: ['EMAIL', 'SMS'] })
  @IsEnum(['EMAIL', 'SMS'], { message: ValidationErrors.METHOD_INVALID })
  @IsNotEmpty({ message: ValidationErrors.METHOD_INVALID })
  method!: 'EMAIL' | 'SMS';
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  @IsNotEmpty({ message: ValidationErrors.CONTACT_REQUIRED })
  contact!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty({ message: ValidationErrors.CODE_REQUIRED })
  code!: string;

  @ApiProperty({
    enum: ['VERIFICATION', 'PASSWORD_RESET'],
    default: 'VERIFICATION',
    required: false,
  })
  @IsOptional()
  @IsEnum(['VERIFICATION', 'PASSWORD_RESET'])
  purpose?: 'VERIFICATION' | 'PASSWORD_RESET' = 'VERIFICATION';
}

export class LogoutDto {
  @ApiProperty({ example: 'fcm-token-123', required: false })
  @IsString()
  @IsOptional()
  fcmToken?: string;
}

export class SocialLoginDto {
  @ApiProperty({ example: 'GOOGLE' })
  @IsString()
  @IsNotEmpty()
  provider!: string;

  @ApiProperty({ example: '123456789', required: false })
  @IsString()
  @IsOptional()
  providerAccountId?: string;

  @ApiProperty({ example: 'eyJhbGciOiJSUzI1NiIs...', required: true })
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  @ApiProperty({ example: 'user@example.com', required: false })
  @IsEmail({}, { message: ValidationErrors.EMAIL_INVALID })
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'customer', required: false })
  @IsString()
  @IsOptional()
  app?: string;
}
