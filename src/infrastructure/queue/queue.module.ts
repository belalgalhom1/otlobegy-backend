import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import Redis, { Cluster } from 'ioredis';
import { parseRedisConfig } from '../redis/redis.parser';
import { QUEUES } from './queues.constants';

const queueModules = BullModule.registerQueue(
  ...Object.values(QUEUES).map((name) => ({ name })),
);

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const { urls, isCluster } = parseRedisConfig(config);

        const connection = isCluster
          ? new Redis.Cluster(urls, {
              redisOptions: { maxRetriesPerRequest: null },
            })
          : new Redis(urls[0], { maxRetriesPerRequest: null });

        return {
          connection,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: { count: 30 },
            removeOnFail: {
              count: 50,
            },
          },
        };
      },
    }),
    queueModules,
  ],
  exports: [BullModule, queueModules],
})
export class QueueModule {}
