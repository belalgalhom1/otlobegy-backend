import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import type { JwtAccessPayload } from '../../common/interfaces/jwt-payload.interface';
import { OrderStatus } from '@prisma/client';
import { OrderErrors, ReviewErrors } from '../../common/constants/response.constants';
import { EVENTS } from '../../common/events/event-names';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async submitReview(actor: JwtAccessPayload, orderId: string, dto: CreateReviewDto): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, customerId: actor.sub },
      include: { review: true },
    });

    if (!order) throw new NotFoundException(OrderErrors.NOT_FOUND);
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(ReviewErrors.NOT_DELIVERED);
    }
    if (order.review) {
      throw new BadRequestException(ReviewErrors.ALREADY_RATED);
    }

    await this.prisma.orderReview.create({
      data: {
        orderId,
        customerId: actor.sub,
        vendorId: order.vendorId,
        driverId: order.driverId,
        vendorRating: dto.vendorRating,
        driverRating: dto.driverRating,
        comment: dto.comment,
      },
    });

    // Emit event so the listener can update aggregates safely
    this.eventEmitter.emit(EVENTS.REVIEW_SUBMITTED, {
      vendorId: order.vendorId,
      driverId: order.driverId,
    });
  }

  async getVendorReviews(vendorId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.orderReview.findMany({
        where: { vendorId, vendorRating: { not: null } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              user: {
                select: {
                  name: true,
                }
              }
            }
          }
        }
      }),
      this.prisma.orderReview.count({
        where: { vendorId, vendorRating: { not: null } },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDriverReviews(driverId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.orderReview.findMany({
        where: { driverId, driverRating: { not: null } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              user: {
                select: {
                  name: true,
                }
              }
            }
          }
        }
      }),
      this.prisma.orderReview.count({
        where: { driverId, driverRating: { not: null } },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
