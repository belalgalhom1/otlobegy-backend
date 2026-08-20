export const QUEUES = {
  MAIL: 'mail_queue',
  PUSH: 'push_queue',
  ORDERS: 'orders_queue',
  STATS: 'stats_queue',
  TICKETS: 'tickets_queue',
  VENDORS: 'vendors_queue',
  DRIVERS: 'drivers_queue',
  PROMOTIONS: 'promotions_queue',
  DISPATCH: 'dispatch_queue',
  AUDIT_LOGS: 'audit_logs_queue',
} as const;

export const MAIL_JOBS = {
  SEND_EMAIL: 'send_email',
} as const;

export const PUSH_JOBS = {
  SEND_TO_DEVICES: 'send_devices',
  SEND_TO_TOPIC: 'send_topic',
  SUBSCRIBE_TO_TOPIC: 'subscribe_topic',
  UNSUBSCRIBE_FROM_TOPIC: 'unsubscribe_topic',
} as const;

export const ORDER_JOBS = {
  DISPATCH: 'order.dispatch',
  DISPATCH_EXPIRE: 'order.dispatch_expire',
  SETTLE: 'order.settle',
  DELIVERY_WATCHDOG: 'order.delivery_watchdog',
  CUSTOMER_APPROVAL_TIMEOUT: 'order.customer_approval_timeout',
} as const;

export const CRON_JOBS = {
  VENDOR_SCHEDULE: 'cron.vendor_schedule',
  AUTO_CANCEL_PENDING: 'cron.auto_cancel_pending',
  EXPIRE_DISPATCHES: 'cron.expire_dispatches',
  TICKET_SLA: 'cron.ticket_sla',
  DATA_RETENTION: 'cron.data_retention',
  ARCHIVE_ORPHANS: 'cron.archive_orphans',
  SYSTEM_HEALTH: 'cron.system_health',
  PROMOTION_CHECK: 'cron.promotion_check',
  STUCK_ORDER_MONITOR: 'cron.stuck_order_monitor',
  UNSETTLED_ORDER_MONITOR: 'cron.unsettled_order_monitor',
  SHIFT_WARNING: 'cron.shift_warning',
  LATE_CHECK: 'cron.late_check',
} as const;

export const STATS_JOBS = {
  UPDATE_VENDOR: 'stats.update_vendor',
  UPDATE_DRIVER: 'stats.update_driver',
  UPDATE_APP: 'stats.update_app',
} as const;

export const AUDIT_JOBS = {
  CREATE: 'audit_log.create',
} as const;

export const TICKET_JOBS = {
  SLA_WATCHDOG: 'ticket.sla_watchdog',
} as const;
