import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { QUEUES, CRON_JOBS } from '../../infrastructure/queue/queues.constants';
import { Prisma } from '@prisma/client';

@Processor(QUEUES.PROMOTIONS, { concurrency: 5 })
export class PromotionsProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(PromotionsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.PROMOTIONS) private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit() {
    this.logger.log('Scheduling Promotions domain cron jobs...');
    await this.queue.add(
      CRON_JOBS.PROMOTION_CHECK,
      {},
      { repeat: { pattern: '0 * * * *' }, jobId: CRON_JOBS.PROMOTION_CHECK },
    );
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case CRON_JOBS.PROMOTION_CHECK:
        return this.handleExpiredPromotions();
      default:
        this.logger.warn(`Unknown promotion job: ${job.name}`);
    }
  }

  private async handleExpiredPromotions(): Promise<void> {
    try {
      const now = new Date();

      // Expire old ones
      const expiredCount = await this.prisma.promotion.updateMany({
        where: {
          isActive: true,
          endDate: { lt: now },
        },
        data: { isActive: false },
      });

      // Activate scheduled ones
      const activatedCount = await this.prisma.promotion.updateMany({
        where: {
          isActive: false,
          startDate: { lte: now },
          endDate: { gt: now },
        },
        data: { isActive: true },
      });

      if (expiredCount.count > 0 || activatedCount.count > 0) {
        this.logger.log(
          `🎁 Promotions: ${activatedCount.count} activated, ${expiredCount.count} expired`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to run promotions checker',
        (error as Error).stack,
      );
    }
  }
}
