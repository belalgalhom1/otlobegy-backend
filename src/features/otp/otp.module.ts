import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';

@Module({
  imports: [PlatformSettingsModule],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
