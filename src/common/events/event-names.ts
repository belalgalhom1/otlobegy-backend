export const EVENTS = {
  // Auth
  AUTH_OTP_REQUESTED: 'auth.otp.requested',

  // Chat
  CHAT_MESSAGE_SENT: 'chat.message.sent',
  CHAT_CONVERSATION_CREATED: 'chat.conversation.created',
  CHAT_CONVERSATION_CLOSED: 'chat.conversation.closed',

  // Tickets
  TICKET_STATUS_UPDATED: 'ticket.status.updated',

  // Orders
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_CHANGED: 'order.status.changed',
  ORDER_PAYMENT_STATUS_CHANGED: 'order.payment_status.changed',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_SETTLED: 'order.settled',

  // Dispatch
  ORDER_DISPATCH_SENT: 'order.dispatch.sent',
  ORDER_DISPATCH_RESPONDED: 'order.dispatch.responded',
  ORDER_DISPATCH_CANCELLED: 'order.dispatch.cancelled',

  // Driver
  DRIVER_LOCATION_UPDATED: 'driver.location.updated',
  DRIVER_STATUS_CHANGED: 'driver.status.changed',
  SHIFT_REMINDER: 'shift.reminder',
  SHIFT_MISSED: 'shift.missed',
  SHIFT_SWAP_CANCELLED: 'shift.swap.cancelled',

  // Audit
  AUDIT_LOG_CREATED: 'audit.log.created',

  // Reviews
  REVIEW_SUBMITTED: 'review.submitted',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
