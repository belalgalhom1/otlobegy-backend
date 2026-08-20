import { Global, Module } from '@nestjs/common';

import { MailListener } from './mail.listener';
import { ChatListener } from './chat.listener';
import { NotificationListener } from './notification.listener';
import { SocketListener } from './socket.listener';
import { OrderListener } from './order.listener';
import { DriverListener } from './driver.listener';
import { AuditLogListener } from './audit-log.listener';
import { DispatchListener } from './dispatch.listener';
import { CartListener } from './cart.listener';
import { ReviewListener } from './review.listener';
import { DispatchModule } from '../../features/dispatch/dispatch.module';
import { CartModule } from '../../features/cart/cart.module';
import { PlatformSettingsModule } from '../../features/platform-settings/platform-settings.module';
import { DriversModule } from '../../features/drivers/drivers.module';

@Global()
@Module({
  imports: [
    DispatchModule, // provides DispatchService for OrderListener & DispatchListener
    PlatformSettingsModule, // provides PlatformSettingsService for OrderListener
    DriversModule, // provides DriversService for SocketListener
    CartModule, // provides CartService for CartListener
  ],
  providers: [
    MailListener,
    ChatListener,
    NotificationListener,
    OrderListener,
    DriverListener,
    AuditLogListener,
    SocketListener,
    DispatchListener,
    CartListener,
    ReviewListener,
  ],
  exports: [
    MailListener,
    ChatListener,
    NotificationListener,
    SocketListener,
    DriverListener,
    AuditLogListener,
    DispatchListener,
    CartListener,
    ReviewListener,
  ],
})
export class ListenersModule {}
