import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidate } from './common/config/env.validation';

import { LoggerModule } from './infrastructure/logger/logger.module';
import { JwtConfigModule } from './infrastructure/jwt/jwt-config.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { SocketGatewayModule } from './infrastructure/socket/socket-gateway.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { EventsModule } from './infrastructure/events/events.module';
import { SocketModule } from './infrastructure/socket/socket.module';
import { DriversModule } from './features/drivers/drivers.module';
import { SocketListener } from './common/listeners/socket.listener';
import { StorageModule } from './infrastructure/storage/storage.module';
import { AppCacheModule } from './infrastructure/cache/cache.module';
import { LocationModule } from './infrastructure/location/location.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: envValidate,
    }),

    LoggerModule,
    JwtConfigModule,
    RedisModule,
    PrismaModule,
    EventsModule,
    SocketModule,
    SocketGatewayModule,
    DriversModule,
    StorageModule,
    AppCacheModule,
    LocationModule,
  ],
  providers: [SocketListener],
})
export class WsModule {}
