import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidate } from './common/config/env.validation';
import { ListenersModule } from './common/listeners/listener.module';

import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { EventsModule } from './infrastructure/events/events.module';
import { AppCacheModule } from './infrastructure/cache/cache.module';
import { LocationModule } from './infrastructure/location/location.module';
import { MailModule } from './infrastructure/mail/mail.module';
import { PushModule } from './infrastructure/push/push.module';
import { SocketModule } from './infrastructure/socket/socket.module';
import { JwtConfigModule } from './infrastructure/jwt/jwt-config.module';

import { PlatformSettingsModule } from './features/platform-settings/platform-settings.module';
import { NotificationsModule } from './features/notifications/notifications.module';
import { CartModule } from './features/cart/cart.module';
import { DispatchModule } from './features/dispatch/dispatch.module';
import { StatisticsModule } from './features/statistics/statistics.module';
import { StatisticsProcessor } from './features/statistics/statistics.processor';
import { OrdersModule } from './features/orders/orders.module';
import { OrdersProcessor } from './features/orders/orders.processor';
import { TicketsModule } from './features/tickets/tickets.module';
import { TicketsProcessor } from './features/tickets/tickets.processor';
import { AuditLogsModule } from './features/audit-logs/audit-logs.module';
import { AuditLogsProcessor } from './features/audit-logs/audit-logs.processor';
import { DispatchProcessor } from './features/dispatch/dispatch.processor';
import { VendorsModule } from './features/vendors/vendors.module';
import { VendorsProcessor } from './features/vendors/vendors.processor';
import { DriversModule } from './features/drivers/drivers.module';
import { DriversProcessor } from './features/drivers/drivers.processor';
import { DriverShiftsModule } from './features/driver-shifts/driver-shifts.module';
import { PromotionsModule } from './features/promotions/promotions.module';
import { PromotionsProcessor } from './features/promotions/promotions.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: envValidate,
    }),
    LoggerModule,
    PrismaModule,
    JwtConfigModule,
    QueueModule,
    RedisModule,
    StorageModule,
    EventsModule,
    AppCacheModule,
    LocationModule,
    SocketModule,

    MailModule.register({ enableWorker: true }),
    PushModule.register({ enableWorker: true }),

    PlatformSettingsModule,
    CartModule,
    DispatchModule,
    StatisticsModule,
    OrdersModule,
    TicketsModule,
    VendorsModule,
    DriversModule,
    DriverShiftsModule,
    NotificationsModule,
    PromotionsModule,
    AuditLogsModule,
    ListenersModule,
  ],
  providers: [
    // Processors live only in the worker process
    OrdersProcessor,
    StatisticsProcessor,
    TicketsProcessor,
    VendorsProcessor,
    DriversProcessor,
    PromotionsProcessor,
    DispatchProcessor,
    AuditLogsProcessor,
  ],
})
export class WorkerModule {}
