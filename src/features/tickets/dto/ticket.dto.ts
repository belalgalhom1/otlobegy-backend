import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
  Prisma,
} from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ example: 'Issue with order' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ example: 'My order has not arrived yet', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    enum: TicketCategory,
    default: TicketCategory.OTHER,
    required: false,
  })
  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory = TicketCategory.OTHER;

  @ApiProperty({ example: 'Delayed delivery', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  subCategory?: string;

  @ApiProperty({ example: { transactionId: '12345' }, required: false })
  @IsOptional()
  metadata?: Prisma.InputJsonValue;

  @ApiProperty({
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
    required: false,
  })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority = TicketPriority.MEDIUM;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  orderId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  vendorId?: string;
}

export class UpdateTicketDto {
  @ApiProperty({ enum: TicketStatus, required: false })
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @ApiProperty({ enum: TicketPriority, required: false })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @ApiProperty({ enum: TicketCategory, required: false })
  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @ApiProperty({ example: 'Updated subject', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({ example: 'Updated description', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 'Updated subCategory', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  subCategory?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  vendorId?: string;

  @ApiProperty({ example: { updated: true }, required: false })
  @IsOptional()
  metadata?: Prisma.InputJsonValue;
}

export class QueryTicketsDto {
  @ApiProperty({ enum: TicketStatus, required: false })
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @ApiProperty({ enum: TicketPriority, required: false })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @ApiProperty({ enum: TicketCategory, required: false })
  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  creatorId?: string;

  @ApiProperty({ example: 1, required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 20, required: false, default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
