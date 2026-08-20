import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JWT_REFRESH_SERVICE } from 'src/common/constants/jwt.constants';
import { StringValue } from 'ms';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow<string>(
            'JWT_REFRESH_EXPIRATION',
          ) as StringValue,
        },
      }),
    }),
  ],
  providers: [
    {
      provide: JWT_REFRESH_SERVICE,
      useFactory: (jwtService: JwtService) => jwtService,
      inject: [JwtService],
    },
  ],
  exports: [JWT_REFRESH_SERVICE],
})
export class JwtRefreshModule {}
