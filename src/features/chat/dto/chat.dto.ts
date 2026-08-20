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
  ValidateIf,
  IsNumber,
  IsPositive,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderConversationDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  orderId!: string;
}

export class CreateSupportConversationDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  vendorId?: string;
}

export class CreateVendorConversationDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  vendorId!: string;
}

export class CreateDirectConversationDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;
}

export class QueryConversationsDto {
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

export class MediaMetadataDto {
  @ApiProperty({ example: 'image/jpeg', required: false })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiProperty({ example: 1024, required: false })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  sizeBytes?: number;

  @ApiProperty({ example: 60, required: false })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  durationSeconds?: number;

  @ApiProperty({ example: 1920, required: false })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  width?: number;

  @ApiProperty({ example: 1080, required: false })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  height?: number;

  @ApiProperty({ example: 'https://example.com/thumb.jpg', required: false })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiProperty({ type: [Number], required: false })
  @IsOptional()
  waveform?: number[];
}

export class LocationMetadataDto {
  @ApiProperty({ example: [30.0444, 31.2357], minItems: 2, maxItems: 2 })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  location!: [number, number];

  @ApiProperty({ example: 'Cairo, Egypt', required: false })
  @IsString()
  @IsOptional()
  address?: string;
}

export class SendMessageDto {
  @ApiProperty({ enum: MessageType })
  @IsEnum(MessageType)
  @IsNotEmpty()
  type!: MessageType;

  @ApiProperty({ example: 'Hello!', maxLength: 4000, required: false })
  @ValidateIf((o: SendMessageDto) => o.type === MessageType.TEXT)
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text?: string;

  @ApiProperty({ example: 'https://example.com/media.jpg', required: false })
  @ValidateIf((o: SendMessageDto) =>
    (
      [MessageType.IMAGE, MessageType.VIDEO, MessageType.AUDIO] as MessageType[]
    ).includes(o.type),
  )
  @IsString()
  @IsNotEmpty()
  mediaUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  metadata?: MediaMetadataDto | LocationMetadataDto | Record<string, unknown>;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  replyToId?: string;
}

export class QueryMessagesDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  before?: string;

  @ApiProperty({ example: 30, required: false, default: 30, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 30;
}

export class MarkReadDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  lastReadMessageId?: string;
}
