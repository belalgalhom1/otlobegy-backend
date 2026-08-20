import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  QUEUES,
  AUDIT_JOBS,
} from '../../infrastructure/queue/queues.constants';

@Processor(QUEUES.AUDIT_LOGS, { concurrency: 20 })
export class AuditLogsProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditLogsProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.debug(`Processing audit log job ${job.name} (id: ${job.id})`);

    switch (job.name) {
      case AUDIT_JOBS.CREATE:
        return this.handleCreateAuditLog(job);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return { ignored: true, reason: 'unknown_job_name' };
    }
  }

  private async handleCreateAuditLog(job: Job<any>) {
    const data = job.data;
    await this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        vendorId: data.vendorId,
        sessionId: data.sessionId,
        actionType: data.actionType,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        newValues: data.newValues,
      },
    });
    return { created: true };
  }
}
