import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { AuthErrors } from 'src/common/constants/response.constants';
import * as crypto from 'crypto';

import { PlatformSettingsService } from '../platform-settings/platform-settings.service';

export type OtpPurpose = 'VERIFICATION' | 'PASSWORD_RESET';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private redis: RedisService,
    private platformSettings: PlatformSettingsService,
  ) {}

  async generateOtp(
    identifier: string,
    purpose: OtpPurpose = 'VERIFICATION',
  ): Promise<string> {
    const code = crypto.randomInt(100000, 999999).toString();
    const key = `otp:${purpose.toLowerCase()}:${identifier}`;
    const attemptsKey = `otp:attempts:${purpose.toLowerCase()}:${identifier}`;

    const settings = await this.platformSettings.getSettings();

    await this.redis.set(key, code, settings.otpExpirySeconds);
    await this.redis.del(attemptsKey);

    return code;
  }

  async validateOtp(
    identifier: string,
    code: string,
    purpose: OtpPurpose = 'VERIFICATION',
  ): Promise<boolean> {
    const key = `otp:${purpose.toLowerCase()}:${identifier}`;
    const attemptsKey = `otp:attempts:${purpose.toLowerCase()}:${identifier}`;

    const settings = await this.platformSettings.getSettings();

    // Atomic increment to prevent concurrent brute-force attacks
    const attempts = await this.redis.incr(attemptsKey);
    if (attempts === 1) {
      await this.redis.expire(attemptsKey, settings.otpExpirySeconds);
    }
    
    if (attempts > settings.maxOtpAttempts) {
      throw new BadRequestException(AuthErrors.TOO_MANY_FAILED_OTP);
    }

    const storedCode = await this.redis.get(key);

    if (!storedCode || storedCode !== code) {
      return false;
    }

    await this.redis.del(key);
    await this.redis.del(attemptsKey);
    return true;
  }

  async peekOtp(
    identifier: string,
    code: string,
    purpose: OtpPurpose = 'VERIFICATION',
  ): Promise<boolean> {
    const key = `otp:${purpose.toLowerCase()}:${identifier}`;
    const attemptsKey = `otp:attempts:${purpose.toLowerCase()}:${identifier}`;

    const settings = await this.platformSettings.getSettings();

    // Atomic increment to prevent concurrent brute-force attacks
    const attempts = await this.redis.incr(attemptsKey);
    if (attempts === 1) {
      await this.redis.expire(attemptsKey, settings.otpExpirySeconds);
    }
    
    if (attempts > settings.maxOtpAttempts) {
      throw new BadRequestException(AuthErrors.TOO_MANY_FAILED_OTP);
    }

    const storedCode = await this.redis.get(key);

    if (storedCode !== code) {
      return false;
    }

    return true;
  }

  async deleteOtp(
    identifier: string,
    purpose: OtpPurpose = 'VERIFICATION',
  ): Promise<void> {
    const key = `otp:${purpose.toLowerCase()}:${identifier}`;
    const attemptsKey = `otp:attempts:${purpose.toLowerCase()}:${identifier}`;
    await this.redis.del(key);
    await this.redis.del(attemptsKey);
  }
}
