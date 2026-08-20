import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTS } from '../events/event-names';
import { OrderCancelledEvent, OrderStatusChangedEvent } from '../events';
import { DispatchService } from '../../features/dispatch/dispatch.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class DispatchListener {
  private readonly logger = new Logger(DispatchListener.name);

  constructor(private readonly dispatchService: DispatchService) {}

  @OnEvent(EVENTS.ORDER_CANCELLED)
  async handleOrderCancelled(event: OrderCancelledEvent) {
    this.logger.debug(`Catching ORDER_CANCELLED event for ${event.orderId}. Terminating active dispatch...`);
    try {
      await this.dispatchService.cancelActiveDispatch(event.orderId);
    } catch (error) {
      this.logger.error(
        `Failed to cancel active dispatch for order ${event.orderId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @OnEvent(EVENTS.ORDER_STATUS_CHANGED)
  async handleOrderStatusChanged(event: OrderStatusChangedEvent) {
    // If order was manually assigned to a driver, or moved to a state that doesn't need dispatch
    if (
      event.newStatus === OrderStatus.DRIVER_ASSIGNED ||
      event.newStatus === OrderStatus.PENDING_PAYMENT
    ) {
      this.logger.debug(`Catching ORDER_STATUS_CHANGED to ${event.newStatus} for ${event.orderId}. Terminating active dispatch...`);
      try {
        await this.dispatchService.cancelActiveDispatch(event.orderId);
      } catch (error) {
        this.logger.error(
          `Failed to cancel active dispatch for order ${event.orderId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}
