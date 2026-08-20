import { Module } from '@nestjs/common';

import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { DriversRepository } from './drivers.repository';

import { AuthModule } from '../auth/auth.module';
import { SocketModule } from '../../infrastructure/socket/socket.module';

@Module({
  imports: [AuthModule, SocketModule],
  controllers: [DriversController],
  providers: [DriversService, DriversRepository],
  exports: [DriversService, DriversRepository],
})
export class DriversModule {}
