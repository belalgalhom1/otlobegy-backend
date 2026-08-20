import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from '../../infrastructure/mail/mail.service';
import { OtpRequestedEvent } from '../events';
import { EVENTS } from '../events/event-names';

@Injectable()
export class MailListener {
  private readonly logger = new Logger(MailListener.name);

  constructor(private readonly mailService: MailService) {}

  @OnEvent(EVENTS.AUTH_OTP_REQUESTED)
  async handleOtpRequested(event: OtpRequestedEvent) {
    if (event.method !== 'EMAIL') return;

    const isVerification = event.purpose === 'VERIFICATION';
    const subject = isVerification
      ? 'Verify your Otlob account'
      : 'Reset your Otlob password';

    const html = isVerification
      ? this.buildVerificationEmail(event.code)
      : this.buildPasswordResetEmail(event.code);

    await this.mailService.sendMail(event.contact, subject, html);
    this.logger.log(`OTP email queued → ${event.contact} [${event.purpose}]`);
  }

  private buildVerificationEmail(code: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:sans-serif;background:#f5f5f5;padding:40px 0;">
        <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;">
          <h2 style="color:#1a1a1a;margin:0 0 8px">Verify your account</h2>
          <p style="color:#555;margin:0 0 32px">Enter this code in the app to verify your email address. It expires in 15 minutes.</p>
          <div style="background:#f0f0f0;border-radius:8px;padding:24px;text-align:center;letter-spacing:8px;font-size:32px;font-weight:700;color:#1a1a1a;">${code}</div>
          <p style="color:#999;font-size:13px;margin:24px 0 0">If you didn't create an Otlob account, you can safely ignore this email.</p>
        </div>
      </body>
      </html>
    `;
  }

  private buildPasswordResetEmail(code: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:sans-serif;background:#f5f5f5;padding:40px 0;">
        <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;">
          <h2 style="color:#1a1a1a;margin:0 0 8px">Reset your password</h2>
          <p style="color:#555;margin:0 0 32px">Enter this code to reset your password. It expires in 15 minutes.</p>
          <div style="background:#f0f0f0;border-radius:8px;padding:24px;text-align:center;letter-spacing:8px;font-size:32px;font-weight:700;color:#1a1a1a;">${code}</div>
          <p style="color:#999;font-size:13px;margin:24px 0 0">If you didn't request a password reset, please secure your account immediately.</p>
        </div>
      </body>
      </html>
    `;
  }
}
