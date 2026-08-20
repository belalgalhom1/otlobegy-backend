import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PushJob } from './push.interface';
import { QUEUES, PUSH_JOBS } from '../queue/queues.constants';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(@InjectQueue(QUEUES.PUSH) private pushQueue: Queue) {}

  async sendToDevices(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    if (!tokens || tokens.length === 0) return;

    await this.addToQueue(PUSH_JOBS.SEND_TO_DEVICES, {
      action: 'SEND',
      tokens,
      title,
      body,
      data,
    });
  }

  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    await this.addToQueue(PUSH_JOBS.SEND_TO_TOPIC, {
      action: 'SEND',
      topic,
      title,
      body,
      data,
    });
  }

  async subscribeToTopic(tokens: string[], topic: string) {
    if (!tokens || tokens.length === 0) return;

    await this.addToQueue(PUSH_JOBS.SUBSCRIBE_TO_TOPIC, {
      action: 'SUBSCRIBE',
      tokens,
      topic,
    });
  }

  async unsubscribeFromTopic(tokens: string[], topic: string) {
    if (!tokens || tokens.length === 0) return;

    await this.addToQueue(PUSH_JOBS.UNSUBSCRIBE_FROM_TOPIC, {
      action: 'UNSUBSCRIBE',
      tokens,
      topic,
    });
  }

  private async addToQueue(
    jobName: string,
    payload: PushJob,
  ): Promise<boolean> {
    try {
      await this.pushQueue.add(jobName, payload);
      this.logger.log(`🚀 Queued [${jobName}] job.`);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to queue [${jobName}]: ${error.message}`);
      } else {
        this.logger.error(`Failed to queue [${jobName}]: ${String(error)}`);
      }
      return false;
    }
  }
}
