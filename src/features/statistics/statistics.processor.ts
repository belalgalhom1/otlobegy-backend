import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue, UnrecoverableError } from 'bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { StatisticsRepository } from './statistics.repository';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  QUEUES,
  STATS_JOBS,
  CRON_JOBS,
} from '../../infrastructure/queue/queues.constants';

@Processor(QUEUES.STATS, { concurrency: 5 })
export class StatisticsProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(StatisticsProcessor.name);

  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly statsRepository: StatisticsRepository,
    private readonly platformSettings: PlatformSettingsService,
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.STATS) private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit() {
    this.logger.log('Scheduling Statistics domain cron jobs...');
    await this.queue.add(
      CRON_JOBS.DATA_RETENTION,
      { type: 'audits' },
      {
        repeat: { pattern: '50 1 * * *' },
        jobId: 'cron.data_retention.audits',
      },
    );
    await this.queue.add(
      CRON_JOBS.DATA_RETENTION,
      { type: 'wallets' },
      {
        repeat: { pattern: '0 2 * * *' },
        jobId: 'cron.data_retention.wallets',
      },
    );
    await this.queue.add(
      CRON_JOBS.DATA_RETENTION,
      { type: 'stats' },
      { repeat: { pattern: '10 2 * * *' }, jobId: 'cron.data_retention.stats' },
    );
  }

  async process(job: Job): Promise<any> {
    this.logger.debug(`Processing stats job [${job.name}] id=${job.id}`);

    switch (job.name) {
      case STATS_JOBS.UPDATE_VENDOR:
        return this.handleUpdateVendor(job);
      case STATS_JOBS.UPDATE_DRIVER:
        return this.handleUpdateDriver(job);
      case STATS_JOBS.UPDATE_APP:
        return this.handleUpdateApp(job);
      case CRON_JOBS.DATA_RETENTION:
        switch (job.data.type) {
          case 'audits':
            return this.handleAuditLogsCleanup();
          case 'wallets':
            return this.handleWalletTransactionsCleanup();
          case 'stats':
            return this.handleStatisticsCleanup();
          default:
            return { skipped: true };
        }
      default:
        throw new UnrecoverableError(`Unknown stats job: ${job.name}`);
    }
  }

  private async handleUpdateVendor(
    job: Job<{ vendorId: string; increment: Record<string, any> }>,
  ) {
    this.logger.debug(`Vendor stat update for ${job.data.vendorId}`);
    const periods = this.statsRepository.getPeriodsForDate(new Date());
    await Promise.all(
      periods.map(({ period, startDate, endDate }) =>
        this.statsRepository.upsertVendorStat(
          job.data.vendorId,
          period,
          startDate,
          endDate,
          job.data.increment,
        ),
      ),
    );
    return { ok: true };
  }

  private async handleUpdateDriver(
    job: Job<{ driverId: string; increment: Record<string, any> }>,
  ) {
    this.logger.debug(`Driver stat update for ${job.data.driverId}`);
    const periods = this.statsRepository.getPeriodsForDate(new Date());
    await Promise.all(
      periods.map(({ period, startDate, endDate }) =>
        this.statsRepository.upsertDriverStat(
          job.data.driverId,
          period,
          startDate,
          endDate,
          job.data.increment,
        ),
      ),
    );
    return { ok: true };
  }

  private async handleUpdateApp(job: Job<{ increment: Record<string, any> }>) {
    this.logger.debug('App stat update');
    const periods = this.statsRepository.getPeriodsForDate(new Date());
    await Promise.all(
      periods.map(({ period, startDate, endDate }) =>
        this.statsRepository.upsertAppStat(
          period,
          startDate,
          endDate,
          job.data.increment,
        ),
      ),
    );
    return { ok: true };
  }

  // ─── CRON Jobs ────────────────────────────────────────────────────────────

  private async handleAuditLogsCleanup(): Promise<void> {
    try {
      const settings = await this.platformSettings.getSettings();
      const cutoff = new Date(
        Date.now() - settings.retentionAuditLogsDays * 24 * 60 * 60 * 1000,
      );

      const result = await this.prisma.auditLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });

      if (result.count > 0) {
        this.logger.log(`🗑️  Hard-deleted ${result.count} old audit logs`);
      }
    } catch (error) {
      this.logger.error(
        'Failed to run audit logs cleanup',
        (error as Error).stack,
      );
    }
  }

  private async handleWalletTransactionsCleanup(): Promise<void> {
    try {
      const settings = await this.platformSettings.getSettings();
      const cutoff = new Date(
        Date.now() -
          settings.retentionWalletTransactionsDays * 24 * 60 * 60 * 1000,
      );

      const p1 = this.prisma.vendorWalletTransaction.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      const p2 = this.prisma.driverWalletTransaction.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });

      const [r1, r2] = await Promise.all([p1, p2]);
      const total = r1.count + r2.count;

      if (total > 0) {
        this.logger.log(`🗑️  Hard-deleted ${total} old wallet transactions`);
      }
    } catch (error) {
      this.logger.error(
        'Failed to run wallet transactions cleanup',
        (error as Error).stack,
      );
    }
  }

  private async handleStatisticsCleanup(): Promise<void> {
    try {
      const settings = await this.platformSettings.getSettings();
      const cutoff = new Date(
        Date.now() - settings.retentionStatisticsDays * 24 * 60 * 60 * 1000,
      );

      const p1 = this.prisma.vendorStatistic.deleteMany({
        where: { endDate: { lt: cutoff } },
      });
      const p2 = this.prisma.driverStatistic.deleteMany({
        where: { endDate: { lt: cutoff } },
      });
      const p3 = this.prisma.appStatistic.deleteMany({
        where: { endDate: { lt: cutoff } },
      });

      const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
      const total = r1.count + r2.count + r3.count;

      if (total > 0) {
        this.logger.log(`🗑️  Hard-deleted ${total} old statistics records`);
      }
    } catch (error) {
      this.logger.error(
        'Failed to run statistics cleanup',
        (error as Error).stack,
      );
    }
  }
}
