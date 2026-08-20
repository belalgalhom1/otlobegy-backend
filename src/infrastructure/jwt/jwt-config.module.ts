import { Global, Module } from '@nestjs/common';
import { JwtAccessModule } from './jwt-access.module';
import { JwtRefreshModule } from './jwt-refresh.module';

@Global()
@Module({
  imports: [JwtAccessModule, JwtRefreshModule],
  exports: [JwtAccessModule, JwtRefreshModule],
})
export class JwtConfigModule {}
