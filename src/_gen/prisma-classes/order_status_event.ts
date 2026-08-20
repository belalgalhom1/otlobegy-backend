import { OrderStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderStatusEvent {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  orderId: string;

  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  status: OrderStatus;

  @ApiPropertyOptional({ type: String })
  note?: string;

  @ApiPropertyOptional({ type: String })
  createdBy?: string;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
