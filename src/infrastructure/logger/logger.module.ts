import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as path from 'path';

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get<string>('NODE_ENV') === 'production';
        const logLevel = config.get<string>('LOG_LEVEL') || 'info';
        const appName = config.get<string>('APP_NAME') || 'OtlobApp';
        const logDir = path.join(process.cwd(), 'storage/logs');

        const transports: winston.transport[] = [
          new winston.transports.Console({
            level: logLevel,
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.ms(),
              nestWinstonModuleUtilities.format.nestLike(appName, {
                colors: true,
                prettyPrint: true,
              }),
            ),
          }),
        ];

        if (isProduction) {
          transports.push(
            new winston.transports.DailyRotateFile({
              dirname: logDir,
              filename: 'error-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              zippedArchive: true,
              maxSize: '20m',
              maxFiles: '30d',
              level: 'error',
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
              ),
            }),

            new winston.transports.DailyRotateFile({
              dirname: logDir,
              filename: 'combined-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              zippedArchive: true,
              maxSize: '20m',
              maxFiles: '14d',
              level: logLevel,
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
              ),
            }),
          );
        }
        return { transports };
      },
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
