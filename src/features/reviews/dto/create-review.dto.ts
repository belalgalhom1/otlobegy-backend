import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, MaxLength, ValidateIf } from 'class-validator';

export class CreateReviewDto {
  @ApiPropertyOptional({ example: 5, description: 'Rating out of 5' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  vendorRating?: number;

  @ApiPropertyOptional({ example: 5, description: 'Rating out of 5' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  driverRating?: number;

  @ApiPropertyOptional({ example: 'Great food!' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  // Ensure at least one rating is provided, otherwise fail validation if both are empty
  @ValidateIf(o => o.vendorRating === undefined && o.driverRating === undefined && o.comment === undefined)
  @IsInt({ message: 'At least one rating (vendor or driver) or a comment must be provided' })
  driverRatingRequiredCheck?: number;
}
