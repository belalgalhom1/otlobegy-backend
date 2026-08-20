import { Module, OnApplicationShutdown, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis, { Cluster } from 'ioredis';
import { parseRedisConfig } from '../redis/redis.parser';

let rateLimiterRedisClient: Redis | Cluster | null = null;

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const { urls, isCluster } = parseRedisConfig(config);

        if (isCluster) {
          rateLimiterRedisClient = new Redis.Cluster(urls, {
            redisOptions: {},
          });
        } else {
          rateLimiterRedisClient = new Redis(urls[0], { db: 1 });
        }
        return {
          errorMessage: 'Too many requests. Please slow down.',
          throttlers: [
            {
              name: 'short',
              ttl: seconds(1),
              limit: 20,
            },
            {
              name: 'medium',
              ttl: seconds(60),
              limit: 200,
            },
          ],
          storage: new ThrottlerStorageRedisService(
            rateLimiterRedisClient as unknown as Redis,
          ),
        };
      },
    }),
  ],
})
export class RateLimiterModule implements OnApplicationShutdown {
  private readonly logger = new Logger(RateLimiterModule.name);

  async onApplicationShutdown() {
    if (rateLimiterRedisClient) {
      this.logger.warn('Rate limiter Redis connection closing...');
      await rateLimiterRedisClient.quit();
      rateLimiterRedisClient = null;
      this.logger.log('Rate limiter Redis connection closed');
    }
  }
}
