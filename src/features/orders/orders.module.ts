import { Module, forwardRef } from '@nestjs/common';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersCheckoutService } from './orders-checkout.service';
import { OrdersStateService } from './orders-state.service';
import { OrdersPaymentService } from './orders-payment.service';
import { OrdersRepository } from './orders.repository';
import { CartModule } from '../cart/cart.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { StatisticsModule } from '../statistics/statistics.module';

@Module({
  imports: [CartModule, forwardRef(() => DispatchModule), StatisticsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersCheckoutService, OrdersStateService, OrdersPaymentService, OrdersRepository],
  exports: [OrdersService, OrdersCheckoutService, OrdersStateService, OrdersPaymentService, OrdersRepository],
})
export class OrdersModule {}
