import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpModule } from '../otp/otp.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRtStrategy } from './strategies/jwt-rt.strategy';
import { GuestGuard } from 'src/common/guards/guest.guard';

@Module({
  imports: [OtpModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRtStrategy, GuestGuard],
  exports: [AuthService],
})
export class AuthModule {}
