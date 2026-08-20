import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { QUEUES } from '../../infrastructure/queue/queues.constants';
import { DriverShiftStatus } from '@prisma/client';
import { CRON_JOBS } from '../../infrastructure/queue/queues.constants';
import { DriverShiftsService } from '../driver-shifts/driver-shifts.service';
import { DriversService } from './drivers.service';

@Processor(QUEUES.DRIVERS, { concurrency: 10 })
export class DriversProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(DriversProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly driverShiftsService: DriverShiftsService,
    private readonly driversService: DriversService,
    @InjectQueue(QUEUES.DRIVERS) private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit() {
    this.logger.log('Scheduling Drivers domain cron jobs...');
    await this.queue.add(
      'cron.driver_shifts',
      {},
      { repeat: { pattern: '*/5 * * * *' }, jobId: 'cron.driver_shifts' },
    );
    await this.queue.add(
      CRON_JOBS.SHIFT_WARNING,
      {},
      { repeat: { pattern: '* * * * *' }, jobId: CRON_JOBS.SHIFT_WARNING },
    );
    await this.queue.add(
      CRON_JOBS.LATE_CHECK,
      {},
      { repeat: { pattern: '* * * * *' }, jobId: CRON_JOBS.LATE_CHECK },
    );
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case 'cron.driver_shifts':
        return this.handleDriverShiftsChecker();
      case CRON_JOBS.SHIFT_WARNING:
        return this.driverShiftsService.handle30MinShiftWarning();
      case CRON_JOBS.LATE_CHECK:
        return this.driverShiftsService.handle5MinLateCheck();
      default:
        this.logger.warn(`Unknown driver job: ${job.name}`);
    }
  }

  private async handleDriverShiftsChecker(): Promise<void> {
    try {
      const now = new Date();

      // 1. Auto-complete ended shifts
      const shiftsToComplete = await this.prisma.driverShift.findMany({
        where: {
          status: DriverShiftStatus.ACTIVE,
          endTime: { lt: now },
        },
        select: { id: true, driverId: true },
      });

      if (shiftsToComplete.length > 0) {
        const driverIds = [...new Set(shiftsToComplete.map((s) => s.driverId))];

        for (const shift of shiftsToComplete) {
          await this.driversService.endShiftBySystem(shift.driverId, shift.id);
        }

        this.logger.log(
          `🏁 Auto-completed ${shiftsToComplete.length} finished driver shifts`,
        );

        // Force drivers offline
        await this.prisma.driver.updateMany({
          where: { id: { in: driverIds } },
          data: { status: 'OFFLINE' },
        });
      }
    } catch (error) {
      this.logger.error(
        'Failed to run driver shifts checker',
        (error as Error).stack,
      );
    }
  }
}
