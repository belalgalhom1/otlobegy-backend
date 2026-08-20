import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SocketService } from '../../infrastructure/socket/socket.service';
import { NotificationsService } from '../../features/notifications/notifications.service';
import { NotificationType, DriverStatus } from '@prisma/client';
import {
  DriverLocationUpdatedEvent,
  DriverStatusChangedEvent,
} from '../events';
import { EVENTS } from '../events/event-names';

@Injectable()
export class DriverListener {
  private readonly logger = new Logger(DriverListener.name);

  constructor(
    private readonly socketService: SocketService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @OnEvent(EVENTS.DRIVER_LOCATION_UPDATED)
  async handleLocationUpdated(event: DriverLocationUpdatedEvent) {
    const payload = {
      driverId: event.driverId,
      longitude: event.longitude,
      latitude: event.latitude,
      timestamp: new Date().toISOString(),
    };

    if (event.activeOrderId && event.customerUserId) {
      // Fire-and-forget
      this.socketService
        .emitToUser(event.customerUserId, 'driver.location', {
          ...payload,
          orderId: event.activeOrderId,
        })
        .catch((err: unknown) =>
          this.logger.error(
            `Failed to emit driver location: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
    }
  }

  @OnEvent(EVENTS.DRIVER_STATUS_CHANGED)
  async handleStatusChanged(event: DriverStatusChangedEvent) {
    this.logger.debug(
      `Driver ${event.driverId}: ${event.oldStatus} → ${event.newStatus}`,
    );

    if (event.reason === 'UNPAID_COMMISSION' && event.newStatus === DriverStatus.SUSPENDED) {
      await this.notificationsService.create({
        userId: event.driverUserId,
        title: 'Account Suspended',
        titleAr: 'تم تعليق الحساب',
        body: 'You have been suspended for unpaid commissions. Please settle your wallet to receive orders again.',
        bodyAr: 'تم تعليق حسابك بسبب العمولات غير المدفوعة. يرجى تسوية محفظتك لاستقبال الطلبات مرة أخرى.',
        type: NotificationType.SYSTEM,
        data: { reason: 'UNPAID_COMMISSION' },
      }).catch(err => this.logger.error(`Failed to notify driver of lockout: ${err}`));
    }

    if (event.reason === 'UNPAID_COMMISSION_SETTLED' && event.oldStatus === DriverStatus.SUSPENDED) {
      await this.notificationsService.create({
        userId: event.driverUserId,
        title: 'Account Unsuspended',
        titleAr: 'تم فك تعليق الحساب',
        body: 'Your wallet top-up was approved. You can now go online and receive orders!',
        bodyAr: 'تمت الموافقة على شحن محفظتك. يمكنك الآن تسجيل الدخول واستقبال الطلبات!',
        type: NotificationType.SYSTEM,
        data: { reason: 'UNPAID_COMMISSION_SETTLED' },
      }).catch(() => {});
    }
  }
}
