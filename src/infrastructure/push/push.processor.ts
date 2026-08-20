import { Inject, Logger } from '@nestjs/common';
import { PushNotificationErrors } from 'src/common/constants/response.constants';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { Messaging, MessagingTopicManagementResponse } from 'firebase-admin/messaging';
import { PrismaService } from '../prisma/prisma.service';
import { FIREBASE_MESSAGING } from './firebase.provider';
import { PushJob } from './push.interface';
import { QUEUES, PUSH_JOBS } from '../queue/queues.constants';

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

const FCM_CONFIG = {
  android: { priority: 'high' as const },
  apns: { payload: { aps: { contentAvailable: true, sound: 'default' } } },
};

@Processor(QUEUES.PUSH, { concurrency: 50 })
export class PushProcessor extends WorkerHost {
  private readonly logger = new Logger(PushProcessor.name);

  constructor(
    @Inject(FIREBASE_MESSAGING) private messaging: Messaging,
    private prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<PushJob>): Promise<unknown> {
    const { tokens, topic, title, body, data } = job.data;

    if (!title || !body) {
      throw new UnrecoverableError('Missing required fields: title and body');
    }

    const notification = { title, body };
    const safeData = this.stringifyData(data);

    switch (job.name) {
      case PUSH_JOBS.SEND_TO_TOPIC:
        if (!topic)
          throw new UnrecoverableError('Topic is missing for send_topic job');
        return this.handleSendToTopic(topic, notification, safeData);

      case PUSH_JOBS.SEND_TO_DEVICES:
        if (!tokens || tokens.length === 0)
          return { skipped: true, reason: 'No tokens' };
        return this.handleSendToDevices(tokens, notification, safeData);

      case PUSH_JOBS.SUBSCRIBE_TO_TOPIC:
        if (!topic)
          throw new UnrecoverableError(
            'Topic is missing for subscribe_topic job',
          );
        if (!tokens || tokens.length === 0)
          return { skipped: true, reason: 'No tokens' };
        return this.handleSubscribe(tokens, topic);

      case PUSH_JOBS.UNSUBSCRIBE_FROM_TOPIC:
        if (!topic)
          throw new UnrecoverableError(
            'Topic is missing for unsubscribe_topic job',
          );
        if (!tokens || tokens.length === 0)
          return { skipped: true, reason: 'No tokens' };
        return this.handleUnsubscribe(tokens, topic);

      default:
        throw new UnrecoverableError(`Unknown job name: ${job.name}`);
    }
  }

  private async handleSendToTopic(
    topic: string,
    notification: { title: string; body: string },
    data: Record<string, string>,
  ) {
    this.logger.debug(`📢 Sending to topic: ${topic}`);

    try {
      const messageId = await this.messaging.send({
        topic,
        notification,
        data,
        ...FCM_CONFIG,
      });

      this.logger.log(`✅ Topic message sent: ${messageId}`);
      return { success: true, messageId };
    } catch (error: unknown) {
      this.logger.error(
        `❌ Topic send failed for [${topic}]: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  private async handleSendToDevices(
    tokens: string[],
    notification: { title: string; body: string },
    data: Record<string, string>,
  ) {
    const chunks = this.chunkArray(tokens, 500);
    let successCount = 0;
    let failureCount = 0;
    const invalidTokens: string[] = [];
    const batchErrors: { index: number; error: unknown }[] = [];

    for (const [index, chunkTokens] of chunks.entries()) {
      try {
        const response = await this.messaging.sendEachForMulticast({
          tokens: chunkTokens,
          notification,
          data,
          ...FCM_CONFIG,
        });

        successCount += response.successCount;
        failureCount += response.failureCount;

        response.responses.forEach((resp, idx) => {
          if (
            !resp.success &&
            INVALID_TOKEN_CODES.has(resp.error?.code ?? '')
          ) {
            const token = chunkTokens[idx];
            if (token) invalidTokens.push(token);
          }
        });
      } catch (error: unknown) {
        this.logger.error(
          `❌ Batch ${index + 1} failed: ${(error as Error).message}`,
        );
        batchErrors.push({ index, error });
      }
    }

    if (invalidTokens.length > 0) {
      await this.cleanupTokens(invalidTokens);
    }

    if (batchErrors.length > 0) {
      this.logger.warn(
        `⚠️ ${batchErrors.length}/${chunks.length} batches failed`,
      );

      if (batchErrors.length === chunks.length) {
        throw new Error(PushNotificationErrors.ALL_BATCHES_FAILED);
      }
    }

    this.logger.log(
      `📊 Send result — success: ${successCount}, failed: ${failureCount}, removed: ${invalidTokens.length}`,
    );
    return {
      success: successCount,
      failed: failureCount,
      removed: invalidTokens.length,
    };
  }

  private async handleSubscribe(tokens: string[], topic: string) {
    const response = await this.messaging.subscribeToTopic(tokens, topic);
    this.logger.log(
      `✅ Subscribed ${response.successCount} devices to [${topic}]`,
    );

    if (response.failureCount > 0) {
      this.logger.warn(
        `⚠️ ${response.failureCount} subscriptions failed for [${topic}]`,
      );
      await this.handleSubscriptionErrors(tokens, response.errors);
    }

    return { success: response.successCount, failed: response.failureCount };
  }

  private async handleUnsubscribe(tokens: string[], topic: string) {
    const response = await this.messaging.unsubscribeFromTopic(tokens, topic);
    this.logger.log(
      `👋 Unsubscribed ${response.successCount} devices from [${topic}]`,
    );

    if (response.failureCount > 0) {
      this.logger.warn(
        `⚠️ ${response.failureCount} unsubscriptions failed for [${topic}]`,
      );
      await this.handleSubscriptionErrors(tokens, response.errors);
    }

    return { success: response.successCount, failed: response.failureCount };
  }

  private async handleSubscriptionErrors(
    tokens: string[],
    errors: MessagingTopicManagementResponse['errors'],
  ) {
    const invalidTokens = errors
      .filter((e) => INVALID_TOKEN_CODES.has(e.error.code))
      .map((e) => tokens[e.index])
      .filter((token): token is string => !!token);

    if (invalidTokens.length > 0) {
      await this.cleanupTokens(invalidTokens);
    }
  }

  private async cleanupTokens(tokens: string[]) {
    const unique = [...new Set(tokens)];
    this.logger.log(`🧹 Removing ${unique.length} invalid tokens...`);
    try {
      await this.prisma.device.deleteMany({
        where: { token: { in: unique } },
      });
    } catch (error: unknown) {
      this.logger.error(
        `❌ Failed to cleanup tokens: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  private stringifyData(
    data: Record<string, unknown> | undefined,
  ): Record<string, string> {
    if (!data) return {};
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [
        k,
        typeof v === 'string' ? v : JSON.stringify(v),
      ]),
    );
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }
}
