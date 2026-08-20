import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsArray,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AddCartItemDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  variantId?: string;

  @ApiProperty({ example: 2, default: 1 })
  @IsInt()
  @Min(1)
  @Max(99)
  @IsOptional()
  @Type(() => Number)
  quantity?: number = 1;

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Selected option IDs',
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  optionIds?: string[] = [];

  @ApiProperty({ example: 'No onions please', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  specialRequest?: string;

  @ApiProperty({ example: 'msg-123456789', required: false })
  @IsString()
  @IsOptional()
  offerMessageId?: string;
}

export class UpdateCartItemDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  @Max(99)
  @Type(() => Number)
  quantity!: number;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  optionIds?: string[];

  @ApiProperty({ example: 'Extra spicy', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  specialRequest?: string;
}
