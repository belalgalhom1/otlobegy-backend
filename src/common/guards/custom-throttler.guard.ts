import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(CustomThrottlerGuard.name);
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as {
      user?: { sub: string };
      ips?: string[];
      ip: string;
    };
    if (request.user?.sub) {
      return Promise.resolve(`user-${request.user.sub}`);
    }

    return Promise.resolve(
      request.ips && request.ips.length ? request.ips[0] : request.ip,
    );
  }
}
