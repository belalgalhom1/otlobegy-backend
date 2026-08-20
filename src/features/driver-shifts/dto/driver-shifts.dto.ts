import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GenerateShiftPoolsDto {
  @ApiProperty({ example: '2026-05-10' })
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiProperty({ example: '2026-05-16' })
  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @IsNotEmpty()
  startTime!: string;

  @ApiProperty({ example: '16:00' })
  @IsString()
  @IsNotEmpty()
  endTime!: string;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  maxDrivers!: number;

  @ApiProperty({ example: 'zone-uuid', required: false })
  @IsString()
  @IsOptional()
  zoneId?: string;
}

export class BookWeeklyShiftsDto {
  @ApiProperty({
    example: [
      'pool-id-1',
      'pool-id-2',
      'pool-id-3',
      'pool-id-4',
      'pool-id-5',
      'pool-id-6',
    ],
  })
  @IsArray()
  @ArrayMinSize(6)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  shiftPoolIds!: string[];
}

export class BookOvertimeShiftDto {
  @ApiProperty({ example: 'pool-id' })
  @IsString()
  @IsNotEmpty()
  shiftPoolId!: string;
}

export class QueryShiftPoolsDto {
  @ApiProperty({ example: '2026-05-10', required: false })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({ example: 'zone-uuid', required: false })
  @IsString()
  @IsOptional()
  zoneId?: string;
}

export class AdminAssignShiftDto {
  @ApiProperty({ example: 'pool-id' })
  @IsString()
  @IsNotEmpty()
  shiftPoolId!: string;

  @ApiProperty({ example: 'driver-id' })
  @IsString()
  @IsNotEmpty()
  driverId!: string;
}
