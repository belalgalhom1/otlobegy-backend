import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class spatial_ref_sys {
  @ApiProperty({ type: Number })
  srid: number;

  @ApiPropertyOptional({ type: String })
  auth_name?: string;

  @ApiPropertyOptional({ type: Number })
  auth_srid?: number;

  @ApiPropertyOptional({ type: String })
  srtext?: string;

  @ApiPropertyOptional({ type: String })
  proj4text?: string;
}
