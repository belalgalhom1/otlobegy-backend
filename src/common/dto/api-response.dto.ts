import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Indicates if the operation was successful' })
  success!: boolean;

  @ApiProperty({ description: 'HTTP status code' })
  statusCode!: number;

  @ApiProperty({ description: 'Response message or translation key' })
  message!: string;

  @ApiProperty({
    description: 'The response payload',
    nullable: true,
  })
  data!: T | null;

  @ApiProperty({
    description: 'Validation errors dictionary',
    nullable: true,
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: { type: 'string' },
    },
    example: { email: ['validation.error.email_required'] },
  })
  errors!: Record<string, string[]> | null;

  @ApiProperty({ description: 'ISO Timestamp of the response' })
  timestamp!: string;
}
