import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Cluster } from 'ioredis';
import { parseRedisConfig } from './redis.parser';

@Injectable()
export class RedisPubSubService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name);
  private readonly publisher: Redis | Cluster;
  private readonly subscriber: Redis | Cluster;
  private readonly handlers = new Map<string, Set<(message: string) => void>>();

  constructor(config: ConfigService) {
    const { urls, isCluster } = parseRedisConfig(config);

    const retryStrategy = (times: number) => Math.min(times * 50, 2000);

    if (isCluster) {
      this.publisher = new Redis.Cluster(urls, {
        clusterRetryStrategy: retryStrategy,
        redisOptions: {},
      });
      this.subscriber = new Redis.Cluster(urls, {
        clusterRetryStrategy: retryStrategy,
        redisOptions: {},
      });
    } else {
      this.publisher = new Redis(urls[0], { retryStrategy });
      this.subscriber = new Redis(urls[0], { retryStrategy });
    }

    this.publisher.on('connect', () =>
      this.logger.log('✅ Redis publisher connected'),
    );

    this.publisher.on('error', (err) => {
      if (err instanceof Error) {
        this.logger.error(`Pub error: ${err.message}`);
      } else {
        this.logger.error(`Pub error: ${String(err)}`);
      }
    });

    this.subscriber.on('connect', () =>
      this.logger.log('✅ Redis subscriber connected'),
    );

    this.subscriber.on('error', (err) => {
      if (err instanceof Error) {
        this.logger.error(`Sub error: ${err.message}`);
      } else {
        this.logger.error(`Sub error: ${String(err)}`);
      }
    });

    this.subscriber.on('message', (channel: string, message: string) => {
      const channelHandlers = this.handlers.get(channel);
      if (!channelHandlers) return;

      for (const handler of channelHandlers) {
        try {
          handler(message);
        } catch (err) {
          if (err instanceof Error) {
            this.logger.error(
              `Handler error on channel [${channel}]: ${err.message}`,
            );
          } else {
            this.logger.error(
              `Handler error on channel [${channel}]: ${String(err)}`,
            );
          }
        }
      }
    });
  }

  async onModuleDestroy() {
    await Promise.all([this.publisher.quit(), this.subscriber.quit()]);
  }

  async publish(channel: string, message: string) {
    await this.publisher.publish(channel, message);
  }

  subscribe(channel: string, handler: (message: string) => void) {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());

      void this.subscriber.subscribe(channel, (err) => {
        if (err) {
          if (err instanceof Error) {
            this.logger.error(
              `Failed to subscribe to [${channel}]: ${err.message}`,
            );
          } else {
            this.logger.error(
              `Failed to subscribe to [${channel}]: ${String(err)}`,
            );
          }
        } else {
          this.logger.log(`✅ Subscribed to channel: ${channel}`);
        }
      });
    }
    this.handlers.get(channel)!.add(handler);
  }

  unsubscribe(channel: string, handler: (message: string) => void) {
    const channelHandlers = this.handlers.get(channel);
    if (!channelHandlers) return;

    channelHandlers.delete(handler);

    if (channelHandlers.size === 0) {
      this.handlers.delete(channel);
      void this.subscriber.unsubscribe(channel);
    }
  }
}
