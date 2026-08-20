import { ApiProperty } from '@nestjs/swagger';

export class NotificationSetting {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  userId: string;

  @ApiProperty({ type: Boolean })
  pushEnabled: boolean = true;

  @ApiProperty({ type: Boolean })
  orderUpdates: boolean = true;

  @ApiProperty({ type: Boolean })
  chatMessages: boolean = true;

  @ApiProperty({ type: Boolean })
  promotions: boolean = true;

  @ApiProperty({ type: Boolean })
  system: boolean = true;

  @ApiProperty({ type: Boolean })
  ticketUpdates: boolean = true;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
