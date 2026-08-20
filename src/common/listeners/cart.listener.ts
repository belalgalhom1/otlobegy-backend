import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTS } from '../events/event-names';
import { OrderCreatedEvent } from '../events';
import { CartService } from '../../features/cart/cart.service';

@Injectable()
export class CartListener {
  private readonly logger = new Logger(CartListener.name);

  constructor(private readonly cartService: CartService) {}

  @OnEvent(EVENTS.ORDER_CREATED)
  async handleOrderCreated(event: OrderCreatedEvent) {
    if (!event.vendorId) return; // Cart logic is specific to vendor-based orders
    
    this.logger.debug(`Catching ORDER_CREATED event for ${event.orderId}. Clearing customer's cart...`);
    try {
      await this.cartService.clearCart(event.customerUserId, event.vendorId);
    } catch (error) {
      this.logger.error(
        `Failed to clear cart for user ${event.customerUserId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
