import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WsModule } from './ws.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisIoAdapter } from './infrastructure/socket/redis-io.adapter';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(WsModule);

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.enableShutdownHooks();

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: false,
      hidePoweredBy: true,
      xssFilter: true,
    }),
  );

  app.enableCors();

  const configService = app.get(ConfigService);

  const redisIoAdapter = new RedisIoAdapter(app, configService);
  await redisIoAdapter.connectToRedis();

  app.useWebSocketAdapter(redisIoAdapter);

  const port = configService.get<number>('WS_PORT') ?? 4000;

  app.set('trust proxy', 1);

  await app.listen(port);

  const logger = new Logger('WsBootstrap');
  logger.log(`🚀 WS server running on port ${port}`);
}

void bootstrap().catch((err) => {
  const logger = new Logger('WsBootstrap');
  logger.error('WS failed to start:', err);
  process.exit(1);
});
