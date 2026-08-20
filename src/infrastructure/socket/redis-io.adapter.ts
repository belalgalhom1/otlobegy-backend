import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis, { Cluster } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { parseRedisConfig } from '../redis/redis.parser';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>;
  private readonly logger = new Logger(RedisIoAdapter.name);

  constructor(
    private appContext: INestApplicationContext,
    private config: ConfigService,
  ) {
    super(appContext);
  }

  async connectToRedis(): Promise<void> {
    const { urls, isCluster } = parseRedisConfig(this.config);

    const retryStrategy = (times: number) => Math.min(times * 50, 2000);

    let pubClient: Redis | Cluster;
    let subClient: Redis | Cluster;

    if (isCluster) {
      pubClient = new Redis.Cluster(urls, {
        clusterRetryStrategy: retryStrategy,
        redisOptions: {},
        lazyConnect: true,
      });
      subClient = new Redis.Cluster(urls, {
        clusterRetryStrategy: retryStrategy,
        redisOptions: {},
        lazyConnect: true,
      });
    } else {
      const options = { retryStrategy, lazyConnect: true };
      pubClient = new Redis(urls[0], options);
      subClient = new Redis(urls[0], options);
    }

    pubClient.on('error', (err) =>
      this.logger.error('Redis Pub Client Error:', err),
    );
    subClient.on('error', (err) =>
      this.logger.error('Redis Sub Client Error:', err),
    );

    await Promise.all([pubClient.connect(), subClient.connect()]).catch(
      (err) => {
        pubClient.disconnect();
        subClient.disconnect();
        throw err;
      },
    );

    this.logger.log('✅ Redis Pub/Sub Clients Connected');
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(
    port: number,
    options?: ServerOptions,
  ): ReturnType<IoAdapter['createIOServer']> {
    if (!this.adapterConstructor) {
      throw new Error(
        'Redis adapter not initialized. Call connectToRedis() first.',
      );
    }
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
