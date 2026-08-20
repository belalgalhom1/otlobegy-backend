export const CommonErrors = {
  VALIDATION_ERROR: 'common.error.validation',
  SERVER_ERROR: 'common.error.server_error',
  UNKNOWN_ERROR: 'common.error.unknown',
  FORBIDDEN: 'common.error.forbidden',
  UNAUTHORIZED: 'common.error.unauthorized',
  TOO_MANY_REQUESTS: 'common.error.too_many_requests',
  FILE_REQUIRED: 'common.error.file_required',
};

export const CommonSuccess = {
  OPERATION_SUCCESS: 'common.success.operation',
  RESOURCE_CREATED: 'common.success.resource_created',
  RESOURCE_UPDATED: 'common.success.resource_updated',
  RESOURCE_DELETED: 'common.success.resource_deleted',
};

export const ValidationErrors = {
  EMAIL_REQUIRED: 'validation.error.email_required',
  EMAIL_INVALID: 'validation.error.email_invalid',
  PASSWORD_REQUIRED: 'validation.error.password_required',
  PASSWORD_WEAK: 'validation.error.password_weak',
  NAME_REQUIRED: 'validation.error.name_required',
  PHONE_INVALID: 'validation.error.phone_invalid',
  CONTACT_REQUIRED: 'validation.error.contact_required',
  CODE_REQUIRED: 'validation.error.code_required',
  METHOD_INVALID: 'validation.error.method_invalid',
};

export const AuthErrors = {
  USER_EXISTS: 'auth.error.user_exists',
  INVALID_CREDENTIALS: 'auth.error.invalid_credentials',
  UNVERIFIED: 'auth.error.unverified',
  BANNED: 'auth.error.banned',
  USER_NOT_FOUND: 'auth.error.user_not_found',
  OTP_INVALID: 'auth.error.otp_invalid',
  OTP_EXPIRED: 'auth.error.otp_expired',
  SESSION_EXPIRED: 'auth.error.session_expired',
  MISSING_HEADER: 'auth.error.missing_header',
  ONLY_CUSTOMER_REGISTRATION: 'auth.error.only_customer_registration',
  TOO_MANY_FAILED_OTP: 'auth.error.too_many_failed_otp',
};

export const UserErrors = {
  USER_NOT_FOUND: 'user.error.user_not_found',
  PROFILE_UPDATE_FAILED: 'user.error.profile_update_failed',
  AVATAR_UPLOAD_FAILED: 'user.error.avatar_upload_failed',
  INVALID_PASSWORD: 'user.error.invalid_password',
  PASSWORD_SAME_AS_OLD: 'user.error.password_same_as_old',
  NOTIFICATION_SETTINGS_NOT_FOUND: 'user.error.notification_settings_not_found',
  ACCOUNT_DELETION_FAILED: 'user.error.account_deletion_failed',
  ONLY_DRIVERS_ALLOWED: 'user.error.only_drivers_allowed',
  ONLY_DRIVER_CREATION_ALLOWED: 'user.error.only_driver_creation_allowed',
  ONLY_DRIVER_ROLE_ALLOWED: 'user.error.only_driver_role_allowed',
  CANNOT_BAN_SUPER_ADMIN: 'user.error.cannot_ban_super_admin',
  CANNOT_DELETE_SUPER_ADMIN: 'user.error.cannot_delete_super_admin',
  CANNOT_CREATE_SUPER_ADMIN: 'user.error.cannot_create_super_admin',
  CANNOT_MODIFY_SUPER_ADMIN: 'user.error.cannot_modify_super_admin',
  LAST_OWNER_OF_VENDOR: 'user.error.last_owner_of_vendor',
};

export const ChatErrors = {
  CONVERSATION_NOT_FOUND: 'chat.error.conversation_not_found',
  NOT_A_PARTICIPANT: 'chat.error.not_a_participant',
  CONVERSATION_CLOSED: 'chat.error.conversation_closed',
  CONVERSATION_NOT_OPEN: 'chat.error.conversation_not_open',
  MESSAGE_NOT_FOUND: 'chat.error.message_not_found',
  NOT_MESSAGE_SENDER: 'chat.error.not_message_sender',
  TEXT_REQUIRED: 'chat.error.text_required',
  MEDIA_URL_REQUIRED: 'chat.error.media_url_required',
  ORDER_NOT_FOUND: 'chat.error.order_not_found',
  VENDOR_NOT_FOUND: 'chat.error.vendor_not_found',
  NOT_SUPPORT_AGENT: 'chat.error.not_support_agent',
  INVALID_MESSAGE_ID: 'chat.error.invalid_message_id',
  NOT_AUTHORIZED: 'chat.error.not_authorized',
  CANNOT_SEND_SYSTEM_MESSAGE: 'chat.error.cannot_send_system_message',
  CANNOT_DELETE_SYSTEM_MESSAGE: 'chat.error.cannot_delete_system_message',
  LOCATION_REQUIRED: 'chat.error.location_required',
  REPLY_TO_NOT_FOUND: 'chat.error.reply_to_not_found',
  REPLY_TO_DELETED: 'chat.error.reply_to_deleted',
  USER_NOT_FOUND: 'chat.error.user_not_found',
  ONLY_TEXT_CAN_BE_EDITED: 'chat.error.only_text_can_be_edited',
};

export const ChatMediaErrors = {
  UNSUPPORTED_TYPE: 'chat.media.error.unsupported_type',
  EXTENSION_MISMATCH: 'chat.media.error.extension_mismatch',
  FILE_TOO_LARGE: 'chat.media.error.file_too_large',
  NO_FILE: 'chat.media.error.no_file',
};

export const NotificationErrors = {
  NOT_FOUND: 'notification.error.not_found',
};

export const CustomerErrors = {
  CUSTOMER_NOT_FOUND: 'customer.error.not_found',
  ADDRESS_NOT_FOUND: 'customer.error.address_not_found',
  OUT_OF_DELIVERY_ZONES: 'customer.error.out_of_delivery_zones',
  FAVORITE_VENDOR_NOT_FOUND: 'customer.error.favorite_vendor_not_found',
  FAVORITE_PRODUCT_NOT_FOUND: 'customer.error.favorite_product_not_found',
  CANNOT_ORDER: 'customer.error.cannot_order',
  INSUFFICIENT_COIN_BALANCE: 'customer.error.insufficient_coin_balance',
  MINIMUM_COINS_REQUIRED: 'customer.error.minimum_coins_required',
};

export const TicketErrors = {
  NOT_FOUND: 'ticket.error.not_found',
  CANNOT_CREATE: 'ticket.error.cannot_create',
  CANNOT_VIEW: 'ticket.error.cannot_view',
  CANNOT_UPDATE: 'ticket.error.cannot_update',
  CANNOT_DELETE: 'ticket.error.cannot_delete',
  ASSIGNEE_MUST_BE_ADMIN: 'ticket.error.assignee_must_be_admin',
  ORDER_NOT_FOUND: 'ticket.error.order_not_found',
  VENDOR_NOT_FOUND: 'ticket.error.vendor_not_found',
  ACTIVE_TICKET_EXISTS: 'ticket.error.active_ticket_exists',
};

export const ZoneErrors = {
  NOT_FOUND: 'zone.error.not_found',
  INVALID_BOUNDARY: 'zone.error.invalid_boundary_polygon',
  INVALID_LOCATION_FOR_ZONE: 'zone.error.invalid_location_for_zone',
  OVERLAPPING_ZONE: 'zone.error.overlapping_zone',
  INVALID_POLYGON: 'zone.error.invalid_polygon_coordinates',
};

export const VendorVerticalErrors = {
  NOT_FOUND: 'vendor_vertical.error.not_found',
  SLUG_TAKEN: 'vendor_vertical.error.slug_taken',
};

export const VendorErrors = {
  NOT_FOUND: 'vendor.error.not_found',
  SLUG_TAKEN: 'vendor.error.slug_taken',
  LOGO_UPLOAD_FAILED: 'vendor.error.logo_upload_failed',
  UNABLE_TO_GENERATE_SLUG: 'vendor.error.unable_to_generate_slug',
  CANNOT_MODIFY_GLOBAL_SETTINGS: 'vendor.error.cannot_modify_global_settings',
  CANNOT_MODIFY_GLOBAL_STATUS: 'vendor.error.cannot_modify_global_status',
  CANNOT_MODIFY_GLOBAL_LOGO: 'vendor.error.cannot_modify_global_logo',
  CANNOT_MODIFY_GLOBAL_COVER: 'vendor.error.cannot_modify_global_cover',
};

export const VendorMemberErrors = {
  NOT_FOUND: 'vendor_member.error.not_found',
  ALREADY_MEMBER: 'vendor_member.error.already_member',
  USER_NOT_FOUND: 'vendor_member.error.user_not_found',
  CANNOT_REMOVE_SELF: 'vendor_member.error.cannot_remove_self',
  OWNER_REQUIRED: 'vendor_member.error.owner_required',
  NOT_A_MEMBER: 'vendor_member.error.not_a_member',
  BRANCH_NOT_FOUND: 'vendor_member.error.branch_not_found',
};

export const VendorBranchErrors = {
  NOT_FOUND: 'vendor_branch.error.not_found',
  CANNOT_CREATE_BRANCH: 'vendor_branch.error.cannot_create_branch',
  NOT_ASSIGNED_BRANCH: 'vendor_branch.error.not_assigned_branch',
};

export const MenuCategoryErrors = {
  NOT_FOUND: 'menu_category.error.not_found',
  BELONGS_TO_OTHER_VENDOR: 'menu_category.error.belongs_to_other_vendor',
};

export const ProductErrors = {
  NOT_FOUND: 'product.error.not_found',
  VARIANT_NOT_FOUND: 'product.error.variant_not_found',
  OPTION_GROUP_NOT_FOUND: 'product.error.option_group_not_found',
  OPTION_NOT_FOUND: 'product.error.option_not_found',
  SKU_TAKEN: 'product.error.sku_taken',
  PRICE_REQUIRED: 'product.error.base_price_required_without_variants',
  CATEGORY_NOT_FOUND: 'product.error.category_not_found',
  IMAGE_UPLOAD_FAILED: 'product.error.image_upload_failed',
};

export const DriverErrors = {
  PROFILE_EXISTS: 'driver.error.profile_exists',
  PROFILE_NOT_FOUND: 'driver.error.profile_not_found',
  ACCOUNT_SUSPENDED: 'driver.error.account_suspended',
  NOT_APPROVED: 'driver.error.not_approved',
  END_TIME_BEFORE_START: 'driver.error.end_time_before_start',
  SHIFT_OVERLAPS: 'driver.error.shift_overlaps',
  SHIFT_NOT_FOUND: 'driver.error.shift_not_found',
  SHIFT_NOT_SCHEDULED: 'driver.error.shift_not_scheduled',
  SHIFT_NOT_ACTIVE: 'driver.error.shift_not_active',
  CANNOT_END_WHILE_ON_DELIVERY: 'driver.error.cannot_end_while_on_delivery',
  ACTIVE_SHIFT_EXISTS: 'driver.error.active_shift_exists',
  SHIFT_POOL_NOT_FOUND: 'driver.error.shift_pool_not_found',
  SHIFT_POOL_FULL: 'driver.error.shift_pool_full',
  ALREADY_ASSIGNED_TO_POOL: 'driver.error.already_assigned_to_pool',
  SHIFTS_DISABLED: 'driver.error.shifts_disabled',
  INVALID_WEEKLY_SHIFTS: 'driver.error.invalid_weekly_shifts',
  SHIFT_POOL_MISSING: 'driver.error.shift_pool_missing',
  SHIFTS_MUST_SPAN_6_DAYS: 'driver.error.shifts_must_span_6_days',
  CANNOT_TAKE_THURSDAY_OFF: 'driver.error.cannot_take_thursday_off',
  CANNOT_TAKE_FRIDAY_OFF: 'driver.error.cannot_take_friday_off',
  OVERLAPPING_SHIFT: 'driver.error.overlapping_shift',
  NOT_YOUR_SHIFT: 'driver.error.not_your_shift',
  ONLY_SCHEDULED_SWAP: 'driver.error.only_scheduled_swap',
  SWAP_TOO_CLOSE: 'driver.error.swap_too_close',
  ALREADY_ON_SWAP_BOARD: 'driver.error.already_on_swap_board',
  SWAP_NOT_AVAILABLE: 'driver.error.swap_not_available',
  CANNOT_ACCEPT_OWN_SWAP: 'driver.error.cannot_accept_own_swap',
  VEHICLE_MISMATCH: 'driver.error.vehicle_mismatch',
  INVALID_START_END_DATE: 'driver.error.invalid_start_end_date',
};

export const OrderErrors = {
  NOT_FOUND: 'order.error.not_found',
  VENDOR_NOT_ACCEPTING: 'order.error.vendor_not_accepting',
  NOT_AUTHORIZED_VENDOR: 'order.error.not_authorized_vendor',
  NOT_AUTHORIZED_VIEW: 'order.error.not_authorized_view',
  NOT_MEMBER_OF_VENDOR: 'order.error.not_member_of_vendor',
  DISPATCH_NOT_FOUND: 'order.error.dispatch_not_found',
  DISPATCH_NOT_PENDING: 'order.error.dispatch_not_pending',
  DISPATCH_EXPIRED: 'order.error.dispatch_expired',
  ORDER_NOT_LOOKING_FOR_DRIVER: 'order.error.order_not_looking_for_driver',
  NOT_ASSIGNED_TO_ORDER: 'order.error.not_assigned_to_order',
  CANNOT_ASSIGN_SUSPENDED_DRIVER: 'order.error.cannot_assign_suspended_driver',
  OUTSIDE_SERVICE_ZONES: 'order.error.outside_service_zones',
  RIDES_MUST_USE_CAR: 'order.error.rides_must_use_car',
  VEHICLE_TYPE_DISABLED: 'order.error.vehicle_type_disabled',
  INVALID_TRANSITION: 'order.error.invalid_transition',
  VENDOR_MUST_CONFIRM_PICKUP: 'order.error.vendor_must_confirm_pickup',
  NO_DRIVERS_AVAILABLE: 'order.error.no_drivers_available',
  CANNOT_CANCEL_ORDER: 'order.error.cannot_cancel_order',
  ALREADY_ASSIGNED_OR_CANCELLED: 'order.error.already_assigned_or_cancelled',
  INSERT_FAILED: 'order.error.insert_failed',
  NOT_MOBILE_WALLET: 'order.error.not_mobile_wallet',
  NOT_AWAITING_PAYMENT: 'order.error.not_awaiting_payment',
  NOT_PENDING_APPROVAL: 'order.error.not_pending_customer_approval',
  APPROVAL_TIMEOUT: 'order.error.customer_approval_timeout',
  CANNOT_EDIT_ITEMS: 'order.error.cannot_edit_items',
  NO_PENDING_CHANGES: 'order.error.no_pending_changes',
  NOT_ASSIGNED_TO_BRANCH: 'order.error.not_assigned_to_branch',
  INVALID_OFFER_MESSAGE: 'order.error.invalid_offer_message',
  PRODUCT_ID_REQUIRED: 'order.error.product_id_required',
  VARIANT_SELECTION_REQUIRED: 'order.error.variant_selection_required',
  INVALID_PRODUCT_MESSAGE: 'order.error.invalid_product_message',
  MAX_ACTIVE_ORDERS_REACHED: 'order.error.max_active_orders_reached',
  CONCURRENT_MODIFICATION: 'order.error.concurrent_modification',
};

export const CartErrors = {
  NOT_ENOUGH_STOCK: 'cart.error.not_enough_stock',
  IS_EMPTY: 'cart.error.is_empty',
  NOT_FOUND: 'cart.error.not_found',
  ITEM_NOT_FOUND: 'cart.error.item_not_found',
  INVALID_OPTION: 'cart.error.invalid_option',
};

export const PromotionErrors = {
  NOT_FOUND: 'promotion.error.not_found',
};

export const AuditLogErrors = {
  VENDOR_MEMBER_NO_VENDOR: 'audit_log.error.vendor_member_no_vendor',
  ROLE_NOT_AUTHORIZED: 'audit_log.error.role_not_authorized',
  ADMIN_REQUIRES_PERMISSION: 'audit_log.error.admin_requires_permission',
};

export const WalletErrors = {
  REQUEST_ALREADY_PROCESSED: 'wallet.error.request_already_processed',
  PLATFORM_WALLET_NOT_FOUND: 'wallet.error.platform_wallet_not_found',
  PLATFORM_WALLET_NOT_FOUND_OR_INACTIVE:
    'wallet.error.platform_wallet_not_found_or_inactive',
  REQUEST_NOT_FOUND: 'wallet.error.request_not_found',
  VENDOR_NOT_FOUND: 'wallet.error.vendor_not_found',
  DRIVER_NOT_FOUND: 'wallet.error.driver_not_found',
};

export const PushNotificationErrors = {
  MISSING_CREDENTIALS: 'push.error.missing_credentials',
  ALL_BATCHES_FAILED: 'push.error.all_batches_failed',
};

export const DispatchErrors = {
  NO_NEARBY_DRIVERS: 'dispatch.error.no_nearby_drivers',
  DISPATCH_ALREADY_ACTIVE: 'dispatch.error.already_active',
  MAX_ATTEMPTS_REACHED: 'dispatch.error.max_attempts_reached',
  DRIVER_NOT_IN_CANDIDATES: 'dispatch.error.driver_not_in_candidates',
  DISPATCH_EXPIRED: 'dispatch.error.expired',
};

export const PlatformSettingsErrors = {
  NOT_FOUND: 'platform_settings.error.not_found',
  UPDATE_FAILED: 'platform_settings.error.update_failed',
};

export const ReviewErrors = {
  NOT_DELIVERED: 'review.error.not_delivered',
  ALREADY_RATED: 'review.error.already_rated',
};

