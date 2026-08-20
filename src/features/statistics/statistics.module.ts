import { Global, Module } from '@nestjs/common';

import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { StatisticsRepository } from './statistics.repository';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';

import { SocketModule } from '../../infrastructure/socket/socket.module';

@Global()
@Module({
  imports: [PlatformSettingsModule, SocketModule],
  controllers: [StatisticsController],
  providers: [StatisticsService, StatisticsRepository],
  exports: [StatisticsService, StatisticsRepository],
})
export class StatisticsModule {}
