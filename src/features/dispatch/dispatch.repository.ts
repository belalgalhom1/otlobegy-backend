import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { DispatchStatus } from '@prisma/client';

export interface CreateDispatchData {
  orderId: string;
  driverId: string;
  driverShiftId: string | null;
  distanceKm: number;
  estimatedEarnings: number;
  expiresAt: Date;
}

@Injectable()
export class DispatchRepository {
  private readonly logger = new Logger(DispatchRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateDispatchData) {
    return this.prisma.orderDispatch.create({
      data: { ...data, status: DispatchStatus.PENDING },
    });
  }

  async findById(dispatchId: string) {
    return this.prisma.orderDispatch.findUnique({
      where: { id: dispatchId },
      include: {
        order: {
          include: {
            customer: { include: { user: { select: { id: true } } } },
          },
        },
      },
    });
  }

  async findPendingForOrder(orderId: string) {
    return this.prisma.orderDispatch.findMany({
      where: { orderId, status: DispatchStatus.PENDING },
    });
  }

  async findPendingForDriver(driverId: string) {
    return this.prisma.orderDispatch.findMany({
      where: { driverId, status: DispatchStatus.PENDING },
      include: {
        order: {
          include: {
            vendor: { select: { id: true, storeName: true, logo: true } },
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(dispatchId: string, status: DispatchStatus) {
    return this.prisma.orderDispatch.update({
      where: { id: dispatchId },
      data: { status },
    });
  }

  async expireStale(dispatchId: string) {
    return this.prisma.orderDispatch.updateMany({
      where: { id: dispatchId, status: DispatchStatus.PENDING },
      data: { status: DispatchStatus.EXPIRED },
    });
  }

  async cancelAllForOrder(orderId: string) {
    return this.prisma.orderDispatch.updateMany({
      where: { orderId, status: DispatchStatus.PENDING },
      data: { status: DispatchStatus.CANCELLED },
    });
  }

  async rejectAllExcept(orderId: string, exceptDispatchId: string) {
    return this.prisma.orderDispatch.updateMany({
      where: {
        orderId,
        id: { not: exceptDispatchId },
        status: DispatchStatus.PENDING,
      },
      data: { status: DispatchStatus.REJECTED },
    });
  }

  async getDispatchedDriverIds(orderId: string): Promise<string[]> {
    const dispatches = await this.prisma.orderDispatch.findMany({
      where: { orderId },
      select: { driverId: true },
    });
    return dispatches.map((d) => d.driverId);
  }



  async getOrderDispatchContext(orderId: string): Promise<{
    lng: number;
    lat: number;
    requestedVehicleType: string | null;
    deliveryLng: number;
    deliveryLat: number;
  } | null> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        "requestedVehicleType",
        COALESCE(
          ST_X("pickupLocation"::geometry),
          (SELECT ST_X(location::geometry) FROM vendors WHERE id = orders."vendorId"),
          ST_X("deliveryLocation"::geometry)
        ) AS lng,
        COALESCE(
          ST_Y("pickupLocation"::geometry),
          (SELECT ST_Y(location::geometry) FROM vendors WHERE id = orders."vendorId"),
          ST_Y("deliveryLocation"::geometry)
        ) AS lat,
        ST_X("deliveryLocation"::geometry) AS "deliveryLng",
        ST_Y("deliveryLocation"::geometry) AS "deliveryLat"
      FROM orders
      WHERE id = ${orderId}
    `;
    return rows[0] ?? null;
  }

  async getDistanceKm(
    fromLng: number,
    fromLat: number,
    toLng: number,
    toLat: number,
  ): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ km: number }>>`
      SELECT ST_Distance(
        ST_SetSRID(ST_MakePoint(${fromLng}, ${fromLat}), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${toLng}, ${toLat}), 4326)::geography
      ) / 1000 AS km
    `;
    return rows[0]?.km ?? 0;
  }
}
