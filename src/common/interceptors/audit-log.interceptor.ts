import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Role, AuditActionType, Prisma } from '@prisma/client';
import { JwtAccessPayload } from '../interfaces/jwt-payload.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTS } from '../events/event-names';
import { AuditLogCreatedEvent } from '../events';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private redactSensitiveFields(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactSensitiveFields(item));
    }

    const redacted = { ...(obj as Record<string, unknown>) };
    const sensitiveKeys = [
      'password',
      'oldPassword',
      'newPassword',
      'token',
      'refreshToken',
      'secret',
      'accessToken',
    ];

    for (const key of Object.keys(redacted)) {
      if (
        sensitiveKeys.includes(key.toLowerCase()) ||
        sensitiveKeys.includes(key)
      ) {
        redacted[key] = '[REDACTED]';
      } else if (typeof redacted[key] === 'object') {
        redacted[key] = this.redactSensitiveFields(redacted[key]);
      }
    }
    return redacted;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      body: unknown;
      params: Record<string, string>;
      user?: JwtAccessPayload;
    }>();
    const { method, url, body, params, user } = req;

    return next.handle().pipe(
      tap((response) => {
        try {
          // Only log mutating requests
          if (['GET', 'OPTIONS', 'HEAD'].includes(method)) return;

          // Only log for specific roles
          if (!user || !user.role) return;
          const allowedRoles: Role[] = [
            Role.VENDOR_MEMBER,
            Role.ADMIN,
            Role.SUPER_ADMIN,
          ];
          if (!allowedRoles.includes(user.role)) {
            return;
          }

          // Determine action type
          let actionType: AuditActionType = AuditActionType.OTHER;
          if (method === 'POST') actionType = AuditActionType.CREATE;
          else if (method === 'PUT' || method === 'PATCH')
            actionType = AuditActionType.UPDATE;
          else if (method === 'DELETE') actionType = AuditActionType.DELETE;

          // Extract entity info from controller name
          let entityType = 'Unknown';
          const controllerClass = context.getClass();
          if (controllerClass && controllerClass.name) {
            entityType = controllerClass.name.replace('Controller', '');
          } else {
            const pathSegments = url.split('?')[0].split('/').filter(Boolean);
            entityType = pathSegments.length > 1 ? pathSegments[1] : 'unknown';
          }

          let entityId = 'unknown';
          if (params && params.id) {
            entityId = params.id;
          } else if (response && (response as Record<string, unknown>).id) {
            entityId = (response as Record<string, unknown>).id as string;
          }

          const vendorId =
            (user as JwtAccessPayload & { vendorId?: string }).vendorId || null;
          const sessionId = user.sid || null;
          const redactedBody = body ? this.redactSensitiveFields(body) : null;

          // Log it (fire and forget)
          this.eventEmitter.emit(
            EVENTS.AUDIT_LOG_CREATED,
            new AuditLogCreatedEvent(
              user.sub,
              vendorId,
              sessionId,
              actionType,
              `${method} ${url.split('?')[0]}`,
              entityType,
              String(entityId),
              redactedBody ?? Prisma.DbNull,
            ),
          );
        } catch (err) {
          this.logger.error(
            'AuditLogInterceptor error',
            err instanceof Error ? err.stack : String(err),
          );
        }
      }),
    );
  }
}
