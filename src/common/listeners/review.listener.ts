import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTS } from '../events/event-names';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class ReviewListener {
  private readonly logger = new Logger(ReviewListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(EVENTS.REVIEW_SUBMITTED, { async: true })
  async handleReviewSubmitted(payload: { vendorId?: string | null; driverId?: string | null }) {
    try {
      if (payload.vendorId) {
        const agg = await this.prisma.orderReview.aggregate({
          where: { vendorId: payload.vendorId, vendorRating: { not: null } },
          _avg: { vendorRating: true },
          _count: { _all: true },
        });

        await this.prisma.vendor.update({
          where: { id: payload.vendorId },
          data: {
            rating: agg._avg.vendorRating || 0,
            ratingCount: agg._count._all,
          },
        });
        
        this.logger.log(`Vendor ${payload.vendorId} rating updated: ${agg._avg.vendorRating} (${agg._count._all} reviews)`);
      }

      if (payload.driverId) {
        const agg = await this.prisma.orderReview.aggregate({
          where: { driverId: payload.driverId, driverRating: { not: null } },
          _avg: { driverRating: true },
          _count: { _all: true },
        });

        const convertedRating = agg._avg.driverRating ? Math.round(agg._avg.driverRating * 100) : 500;
        
        await this.prisma.driver.update({
          where: { userId: payload.driverId },
          data: {
            rating: convertedRating,
            ratingCount: agg._count._all,
          },
        });
        
        this.logger.log(`Driver ${payload.driverId} rating updated: ${convertedRating} (${agg._count._all} reviews)`);
      }
    } catch (error: any) {
      this.logger.error(`Error processing review submitted event: ${error.message}`, error.stack);
    }
  }
}
