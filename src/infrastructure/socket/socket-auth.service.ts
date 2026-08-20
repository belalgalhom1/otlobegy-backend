import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DriverStatus, OrderStatus, ConversationStatus, TicketStatus, Role } from '@prisma/client';

@Injectable()
export class SocketAuthService {
  private readonly logger = new Logger(SocketAuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates if a user is allowed to establish a WebSocket connection.
   */
  async authorize(userId: string, role: string): Promise<boolean> {
    try {
      // Ensure the role is a valid recognized role in the system
      if (!Object.values(Role).includes(role as Role)) {
        this.logger.debug(`Rejecting WS for ${userId}: Invalid or unrecognized role '${role}'`);
        return false;
      }

      if (role === Role.DRIVER) {
        return this.authorizeDriver(userId);
      }

      if (role === Role.CUSTOMER) {
        return this.authorizeCustomer(userId);
      }

      // VENDORS, ADMINS, SUPER_ADMIN are allowed by default for operational monitoring
      return true;
    } catch (err) {
      if (err instanceof Error) {
        this.logger.error(`Socket auth failed for ${userId}: ${err.message}`);
      }
      return false;
    }
  }

  private async authorizeDriver(userId: string): Promise<boolean> {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { status: true },
    });

    if (!driver) return false;

    // Reject offline or suspended drivers
    if (driver.status === DriverStatus.OFFLINE || driver.status === DriverStatus.SUSPENDED) {
      this.logger.debug(`Rejecting WS for driver ${userId} (status: ${driver.status})`);
      return false;
    }

    return true;
  }

  private async authorizeCustomer(userId: string): Promise<boolean> {
    // We allow all JWT-authenticated customers to connect to the socket.
    // Idle sockets are extremely cheap, and rejecting them costs DB queries + client retries.
    return true;
  }
}
