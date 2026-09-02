import { DispatchStatus, OrderStatus, TicketStatus } from '@prisma/client';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export class OtpRequestedEvent {
  constructor(
    public readonly contact: string,
    public readonly code: string,
    public readonly method: 'EMAIL' | 'SMS',
    public readonly purpose: 'VERIFICATION' | 'PASSWORD_RESET' = 'VERIFICATION',
  ) {}
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export class ChatMessageSentEvent {
  constructor(
    public readonly messageId: string,
    public readonly conversationId: string,
    public readonly senderId: string,
    public readonly senderName: string,
    public readonly senderRole: string,
    public readonly participantIds: string[],
    public readonly text: string | null,
    public readonly type: string,
    public readonly mediaUrl: string | null,
    public readonly metadata: Record<string, unknown> | null,
    public readonly createdAt: Date,
  ) {}
}

export class ChatConversationCreatedEvent {
  constructor(
    public readonly conversationId: string,
    public readonly participantIds: string[],
    public readonly type: string,
    public readonly orderId: string | null,
  ) {}
}

export class ChatConversationClosedEvent {
  constructor(
    public readonly conversationId: string,
    public readonly participantIds: string[],
    public readonly closedBy: string,
  ) {}
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export class TicketStatusUpdatedEvent {
  constructor(
    public readonly ticketId: string,
    public readonly ticketNumber: string,
    public readonly status: TicketStatus,
    public readonly creatorId: string,
    public readonly actorId: string,
  ) {}
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly customerUserId: string,
    public readonly vendorId: string | null,
    public readonly vendorUserIds: string[], // all vendor member userIds
    public readonly grandTotal: number,
    public readonly paymentMethod: string,
    public readonly orderType: string,
  ) {}
}

export class OrderStatusChangedEvent {
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly oldStatus: OrderStatus,
    public readonly newStatus: OrderStatus,
    public readonly customerId: string,
    public readonly customerUserId: string,
    public readonly vendorId: string | null,
    public readonly vendorUserIds: string[],
    public readonly driverId: string | null,
    public readonly driverUserId: string | null,
    public readonly actorUserId: string,
    public readonly note: string | null,
  ) {}
}

export class OrderPaymentStatusChangedEvent {
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly paymentStatus: string, // PENDING, PAID, COMPLETED
    public readonly customerUserId: string,
    public readonly driverUserId: string | null,
    public readonly vendorUserIds: string[],
    public readonly message: string,
  ) {}
}

export class OrderCancelledEvent {
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly customerUserId: string,
    public readonly vendorId: string | null,
    public readonly vendorUserIds: string[],
    public readonly driverId: string | null,
    public readonly driverUserId: string | null,
    public readonly reason: string,
    public readonly cancelledByUserId: string | null, // null = system cancel
  ) {}
}

export class OrderSettledEvent {
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly vendorId: string | null,
    public readonly driverId: string,
    public readonly driverShiftId: string | null,
    public readonly grandTotal: number,
    public readonly deliveryFee: number,
    public readonly commissionRate: number,
    public readonly taxRate: number,
  ) {}
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

export class OrderDispatchSentEvent {
  constructor(
    public readonly dispatchId: string,
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly driverId: string,
    public readonly driverUserId: string,
    public readonly type: string,
    public readonly estimatedEarnings: number,
    public readonly distanceKm: number,
    public readonly expiresAt: Date,
    public readonly pickupLocationName?: string,
    public readonly dropoffLocationName?: string,
  ) {}
}

export class OrderDispatchRespondedEvent {
  constructor(
    public readonly dispatchId: string,
    public readonly orderId: string,
    public readonly driverId: string,
    public readonly status: DispatchStatus, // ACCEPTED | REJECTED | EXPIRED
  ) {}
}

export class OrderDispatchCancelledEvent {
  constructor(
    public readonly dispatchId: string,
    public readonly orderId: string,
    public readonly driverUserId: string,
  ) {}
}

// ─── Driver ───────────────────────────────────────────────────────────────────

export class DriverLocationUpdatedEvent {
  constructor(
    public readonly driverId: string,
    public readonly driverUserId: string,
    public readonly longitude: number,
    public readonly latitude: number,
    public readonly activeOrderId: string | null, // broadcast to customer if on delivery
    public readonly customerUserId: string | null,
  ) {}
}

export class DriverStatusChangedEvent {
  constructor(
    public readonly driverId: string,
    public readonly driverUserId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string,
    public readonly reason: string | null = null,
  ) {}
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export class AuditLogCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly vendorId: string | null,
    public readonly sessionId: string | null,
    public readonly actionType: any,
    public readonly action: string,
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly newValues: any,
  ) {}
}

// --- Driver Shifts ---

export class ShiftReminderEvent {
  constructor(
    public readonly driverUserId: string,
    public readonly shiftId: string,
    public readonly zoneId: string | null,
  ) {}
}

export class ShiftMissedEvent {
  constructor(
    public readonly driverUserId: string,
    public readonly shiftId: string,
    public readonly newTier: string,
  ) {}
}

export class ShiftSwapCancelledEvent {
  constructor(
    public readonly driverUserId: string,
    public readonly shiftId: string,
  ) {}
}

export class ShiftDisabledEvent {
  constructor(
    public readonly driverUserId: string,
    public readonly shiftId: string,
  ) {}
}
