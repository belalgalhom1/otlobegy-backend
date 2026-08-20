import { NestFactory } from '@nestjs/core';
import { ApiModule } from './api.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger, ValidationPipe, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(ApiModule);

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        const result: Record<string, string[]> = {};
        errors.forEach((error) => {
          result[error.property] = Object.values(error.constraints || {});
        });
        return new BadRequestException({ message: result });
      },
    }),
  );

  app.enableCors();

  app.enableShutdownHooks();

  const configService = app.get(ConfigService);

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: false,
      hidePoweredBy: true,
      xssFilter: true,
    }),
  );

  app.set('trust proxy', 1);

  const config = new DocumentBuilder()
    .setTitle('OtlobEgy API')
    .setDescription('The OtlobEgy API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = configService.get<number>('API_PORT') ?? 3000;
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Server is running on port ${port}`);
  logger.log('📝 Swagger documentation On');
}

void bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('API failed to start:', err);
  process.exit(1);
});
