import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as dns from 'dns';
import { promisify } from 'util';
import { SendMailJob } from './mail.interface';
import { QUEUES } from '../queue/queues.constants';

const resolveMx = promisify(dns.resolveMx);

const NETWORK_ERROR_CODES = [
  'ETIMEDOUT',
  'ECONNRESET',
  'ESOCKET',
  'ECONNECTION',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EADDRNOTAVAIL',
];

const TRANSIENT_DNS_ERROR_CODES = ['ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT'];

const SMTP_NAME_DEFAULT = 'App';

@Processor(QUEUES.MAIL, { concurrency: 10 })
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    super();

    const port = this.config.get<number>('SMTP_PORT');
    const host = this.config.get<string>('SMTP_HOST');

    this.transporter = nodemailer.createTransport({
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      idleTimeout: 30000,
      host,
      port,
      secure: port === 465,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    } as nodemailer.TransportOptions);

    this.transporter.verify((error) => {
      if (error) {
        this.logger.error(
          `❌ SMTP Connection Error to ${host}:${port} — ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.log(`✅ SMTP Server Ready (${host}:${port})`);
      }
    });
  }

  async process(job: Job<SendMailJob>): Promise<void> {
    const { to, subject, html } = job.data;

    this.logger.debug(`⚙️ Processing email for: ${to} (Job ID: ${job.id})`);

    try {
      await this.validateRecipientDomain(to);

      const smtpName =
        this.config.get<string>('SMTP_NAME') || SMTP_NAME_DEFAULT;
      const smtpUser = this.config.get<string>('SMTP_USER');
      const from = `"${smtpName}" <${smtpUser}>`;

      await this.transporter.sendMail({ from, to, subject, html });

      this.logger.log(`✅ Email sent successfully to: ${to}`);
    } catch (error: unknown) {
      this.handleMailError(error, to);
    }
  }

  private async validateRecipientDomain(to: string): Promise<void> {
    const atIndex = to.lastIndexOf('@');
    if (atIndex === -1) {
      throw new UnrecoverableError(
        `Invalid email address (no @ symbol): ${to}`,
      );
    }

    const domain = to.substring(atIndex + 1);
    if (!domain || domain.trim() === '') {
      throw new UnrecoverableError(
        `Invalid email address (empty domain): ${to}`,
      );
    }

    if (domain === 'localhost') {
      return;
    }

    try {
      const addresses = await resolveMx(domain);
      if (!addresses || addresses.length === 0) {
        throw new UnrecoverableError(
          `No MX records found for domain: ${domain}`,
        );
      }
    } catch (dnsError: unknown) {
      if (dnsError instanceof UnrecoverableError) {
        throw dnsError;
      }

      const code = (dnsError as { code?: string }).code;
      if (code && TRANSIENT_DNS_ERROR_CODES.includes(code)) {
        this.logger.warn(
          `🌐 Transient DNS error for '${domain}' (${code}). BullMQ will retry.`,
        );
        throw dnsError;
      }

      this.logger.warn(
        `🚫 Permanent DNS failure for '${domain}' (${code}). Blocking job.`,
      );
      throw new UnrecoverableError(
        `Invalid domain '${domain}': ${(dnsError as Error).message}`,
      );
    }
  }

  private handleMailError(error: unknown, to: string): never {
    const err = error as {
      responseCode?: number;
      code?: string;
      response?: string;
      message?: string;
      stack?: string;
    };
    const responseCode = err?.responseCode;
    const errorCode = err?.code;
    const response = err?.response || '';
    const message = err?.message || 'Unknown error';

    if (error instanceof UnrecoverableError) {
      throw error;
    }

    this.logger.error(
      `❌ Failed to send to ${to}: [${responseCode ?? errorCode ?? 'N/A'}] ${message}`,
      err.stack,
    );

    if (errorCode && NETWORK_ERROR_CODES.includes(errorCode)) {
      this.logger.warn(`🌐 Network error (${errorCode}). BullMQ will retry.`);
      throw error;
    }

    const isPermanent5xx =
      responseCode !== undefined && responseCode >= 500 && responseCode < 600;
    const isPermanentRecipientError =
      /user unknown/i.test(response) ||
      /no such user/i.test(response) ||
      /invalid recipient/i.test(message) ||
      /mailbox not found/i.test(response) ||
      /spam/i.test(response);

    if (isPermanent5xx || isPermanentRecipientError) {
      this.logger.warn(
        `🚫 Permanent error (${responseCode}). Marking job as unrecoverable.`,
      );
      throw new UnrecoverableError(message || 'Permanent SMTP error');
    }

    const isTemporary4xx =
      responseCode !== undefined && responseCode >= 400 && responseCode < 500;
    if (isTemporary4xx) {
      this.logger.warn(
        `⏳ Temporary 4xx rejection (${responseCode}). BullMQ will retry.`,
      );
      throw error;
    }

    this.logger.warn(
      `⏳ Unclassified rejection (${responseCode ?? 'N/A'}). BullMQ will retry.`,
    );
    throw error;
  }
}
