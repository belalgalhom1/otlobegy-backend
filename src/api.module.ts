import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { envValidate } from './common/config/env.validation';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ApiController } from './api.controller';

import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { JwtConfigModule } from './infrastructure/jwt/jwt-config.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { SocketModule } from './infrastructure/socket/socket.module';
import { AppCacheModule } from './infrastructure/cache/cache.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { EventsModule } from './infrastructure/events/events.module';
import { RateLimiterModule } from './infrastructure/rate-limiter/rate-limiter.module';
import { LocationModule } from './infrastructure/location/location.module';

import { MailModule } from './infrastructure/mail/mail.module';
import { PushModule } from './infrastructure/push/push.module';

import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { VerifiedGuard } from './common/guards/verified.guard';

import { AuthModule } from './features/auth/auth.module';
import { DevicesModule } from './features/devices/devices.module';
import { UsersModule } from './features/users/users.module';
import { NotificationsModule } from './features/notifications/notifications.module';
import { ChatModule } from './features/chat/chat.module';
import { InboxModule } from './features/inbox/inbox.module';
import { CustomersModule } from './features/customers/customers.module';
import { ZonesModule } from './features/zones/zones.module';
import { TicketsModule } from './features/tickets/tickets.module';
import { VendorsModule } from './features/vendors/vendors.module';
import { PlatformSettingsModule } from './features/platform-settings/platform-settings.module';
import { PromotionsModule } from './features/promotions/promotions.module';
import { CartModule } from './features/cart/cart.module';
import { DriversModule } from './features/drivers/drivers.module';
import { OrdersModule } from './features/orders/orders.module';
import { DispatchModule } from './features/dispatch/dispatch.module';
import { DriverShiftsModule } from './features/driver-shifts/driver-shifts.module';
import { StatisticsModule } from './features/statistics/statistics.module';
import { OffersModule } from './features/offers/offers.module';
import { AuditLogsModule } from './features/audit-logs/audit-logs.module';
import { ReviewsModule } from './features/reviews/reviews.module';
import { ListenersModule } from './common/listeners/listener.module';

import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { WalletModule } from './features/wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: envValidate,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    LoggerModule,
    JwtConfigModule,
    QueueModule,
    RedisModule,
    SocketModule,
    StorageModule,
    AppCacheModule,
    RateLimiterModule,
    EventsModule,
    LocationModule,
    MailModule.register({ enableWorker: false }),
    PushModule.register({ enableWorker: false }),

    // Features
    AuthModule,
    DevicesModule,
    UsersModule,
    ChatModule,
    NotificationsModule,
    InboxModule,
    CustomersModule,
    ZonesModule,
    TicketsModule,
    VendorsModule,
    PlatformSettingsModule,
    PromotionsModule,
    CartModule,
    DriversModule,
    DriverShiftsModule,
    DispatchModule,
    StatisticsModule,
    OrdersModule,
    OffersModule,
    AuditLogsModule,
    ReviewsModule,
    // Event listeners (must come after all feature modules)
    ListenersModule,

    WalletModule,
  ],
  controllers: [ApiController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: VerifiedGuard },
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class ApiModule {}
