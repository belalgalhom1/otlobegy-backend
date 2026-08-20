import { Module } from '@nestjs/common';
import { DriverShiftsService } from './driver-shifts.service';
import { DriverShiftsController } from './driver-shifts.controller';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PlatformSettingsModule, NotificationsModule],
  controllers: [DriverShiftsController],
  providers: [DriverShiftsService],
  exports: [DriverShiftsService],
})
export class DriverShiftsModule {}
