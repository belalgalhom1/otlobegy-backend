import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { createKeyv } from '@keyv/redis';
import Redis from 'ioredis';
import { parseRedisConfig } from '../redis/redis.parser';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const { urls, isCluster } = parseRedisConfig(config);

        const redisClient = isCluster
          ? new Redis.Cluster(urls, { redisOptions: {} })
          : new Redis(urls[0]);

        return {
          stores: [createKeyv(redisClient as any)],
          ttl: 600000,
        };
      },
    }),
  ],
  exports: [CacheModule],
})
export class AppCacheModule {}
