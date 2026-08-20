import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SendMailJob } from './mail.interface';
import { QUEUES, MAIL_JOBS } from '../queue/queues.constants';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(@InjectQueue(QUEUES.MAIL) private mailQueue: Queue) {}

  async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      const job: SendMailJob = { to, subject, html };
      await this.mailQueue.add(MAIL_JOBS.SEND_EMAIL, job);
      this.logger.log(`Generated email job for: ${to}`);
      return true;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to queue email for ${to}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return false;
    }
  }
}
