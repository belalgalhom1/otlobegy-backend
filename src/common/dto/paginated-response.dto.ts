import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
  // Items will be documented dynamically by the ApiPaginatedResponse decorator
  items!: T[];

  @ApiProperty({ description: 'Total number of items matching the query' })
  total!: number;

  @ApiProperty({ description: 'Current page number' })
  page!: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit!: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages!: number;
}
