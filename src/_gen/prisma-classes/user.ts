import { Role, Permission, Language } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class User {
  @ApiProperty({ type: String })
  id: string;

  @ApiPropertyOptional({ type: String })
  email?: string;

  @ApiPropertyOptional({ type: String })
  phone?: string;

  @ApiPropertyOptional({ type: String })
  password?: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  role: Role = Role.CUSTOMER;

  @ApiPropertyOptional({ type: String })
  title?: string;

  @ApiPropertyOptional({ type: String })
  titleAr?: string;

  @ApiProperty({ isArray: true, enum: Permission, enumName: 'Permission' })
  permissions: Permission[];

  @ApiPropertyOptional({ type: String })
  avatar?: string;

  @ApiProperty({ enum: Language, enumName: 'Language' })
  language: Language = Language.EN;

  @ApiProperty({ type: Boolean })
  isEmailVerified: boolean;

  @ApiProperty({ type: Boolean })
  isPhoneVerified: boolean;

  @ApiProperty({ type: Boolean })
  isBanned: boolean;

  @ApiPropertyOptional({ type: String })
  banReason?: string;

  @ApiPropertyOptional({ type: String })
  autoReplyMessage?: string;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;

  @ApiPropertyOptional({ type: Date })
  deletedAt?: Date;
}
