import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuditLogCreatedEvent } from '../events';
import { EVENTS } from '../events/event-names';
import {
  QUEUES,
  AUDIT_JOBS,
} from '../../infrastructure/queue/queues.constants';

@Injectable()
export class AuditLogListener {
  private readonly logger = new Logger(AuditLogListener.name);

  constructor(@InjectQueue(QUEUES.AUDIT_LOGS) private readonly queue: Queue) {}

  @OnEvent(EVENTS.AUDIT_LOG_CREATED, { async: true })
  async handleAuditLogCreated(event: AuditLogCreatedEvent) {
    try {
      await this.queue.add(
        AUDIT_JOBS.CREATE,
        {
          userId: event.userId,
          vendorId: event.vendorId,
          sessionId: event.sessionId,
          actionType: event.actionType,
          action: event.action,
          entityType: event.entityType,
          entityId: event.entityId,
          newValues: event.newValues,
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );
    } catch (error) {
      this.logger.error(
        'Failed to save async audit log',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
