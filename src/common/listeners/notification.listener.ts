import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TicketStatusUpdatedEvent } from '../events';
import { EVENTS } from '../events/event-names';
import { NotificationType, TicketStatus } from '@prisma/client';
import { NotificationsService } from '../../features/notifications/notifications.service';

const TICKET_STATUS_LABELS: Record<TicketStatus, { en: string; ar: string }> = {
  [TicketStatus.OPEN]: { en: 'Open', ar: 'مفتوحة' },
  [TicketStatus.IN_PROGRESS]: { en: 'In Progress', ar: 'قيد المعالجة' },
  [TicketStatus.WAITING_ON_USER]: { en: 'Waiting on You', ar: 'في انتظارك' },
  [TicketStatus.RESOLVED]: { en: 'Resolved', ar: 'تم الحل' },
  [TicketStatus.ESCALATED]: { en: 'Escalated', ar: 'تم التصعيد للمدير' },
  [TicketStatus.CLOSED]: { en: 'Closed', ar: 'مغلقة' },
};

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent(EVENTS.TICKET_STATUS_UPDATED)
  async handleTicketStatusUpdated(event: TicketStatusUpdatedEvent) {
    if (event.creatorId === event.actorId) return;

    const label = TICKET_STATUS_LABELS[event.status];

    try {
      await this.notificationsService.create({
        userId: event.creatorId,
        title: `Ticket #${event.ticketNumber} Updated`,
        titleAr: `تم تحديث التذكرة #${event.ticketNumber}`,
        body: `Your ticket status has been changed to: ${label.en}`,
        bodyAr: `تم تغيير حالة تذكرتك إلى: ${label.ar}`,
        type: NotificationType.TICKET_UPDATE,
        data: {
          ticketId: event.ticketId,
          ticketNumber: event.ticketNumber,
          status: event.status,
        },
      });

      this.logger.debug(
        `Ticket ${event.ticketNumber} → ${event.status} | notification created for user ${event.creatorId}`,
      );
    } catch (err: unknown) {
      this.logger.error(
        `Failed to notify user ${event.creatorId} for ticket ${event.ticketNumber}: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  @OnEvent(EVENTS.SHIFT_REMINDER)
  async handleShiftReminder(event: any) {
    await this.notificationsService.create({
      userId: event.driverUserId,
      title: 'Upcoming Shift Reminder',
      titleAr: 'تذكير بالوردية القادمة',
      body: `Your shift at zone ${event.zoneId ?? 'Global'} starts in 30 minutes! Please go online.`,
      bodyAr: `ورديتك في المنطقة ${event.zoneId ?? 'العامة'} تبدأ خلال 30 دقيقة! يرجى تسجيل الدخول.`,
      type: NotificationType.SYSTEM,
      data: { shiftId: event.shiftId },
    }).catch(() => {});
  }

  @OnEvent(EVENTS.SHIFT_MISSED)
  async handleShiftMissed(event: any) {
    await this.notificationsService.create({
      userId: event.driverUserId,
      title: 'Shift Missed / Tier Demotion',
      titleAr: 'تغيب عن الوردية / نزول المستوى',
      body: `You failed to start your shift on time. You have been demoted to ${event.newTier} tier.`,
      bodyAr: `لم تقم ببدء ورديتك في الوقت المحدد. تم تنزيل مستواك إلى ${event.newTier}.`,
      type: NotificationType.SYSTEM,
      data: { shiftId: event.shiftId, type: 'TIER_DEMOTION' },
    }).catch(() => {});
  }

  @OnEvent(EVENTS.SHIFT_SWAP_CANCELLED)
  async handleShiftSwapCancelled(event: any) {
    await this.notificationsService.create({
      userId: event.driverUserId,
      title: 'Shift Swap Cancelled',
      titleAr: 'تم إلغاء تبديل الوردية',
      body: 'Your pending swap was not accepted. You are required to attend this shift in 30 mins.',
      bodyAr: 'لم يتم قبول طلب التبديل. يرجى الحضور للوردية خلال 30 دقيقة.',
      type: NotificationType.SYSTEM,
      data: { shiftId: event.shiftId },
    }).catch(() => {});
  }
}
