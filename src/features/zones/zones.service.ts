import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateZoneDto, UpdateZoneDto, CheckLocationDto, SearchCustomersInPolygonDto } from './dto/zone.dto';
import {
  ZoneErrors,
  CommonSuccess,
} from 'src/common/constants/response.constants';
import * as crypto from 'crypto';

export interface ZoneQueryResult {
  id: string;
  name: string;
  nameAr: string | null;
  isActive: boolean;
  baseDeliveryFeeOverride: number | null;
  minOrderAmountOverride: number | null;
  createdAt: Date;
  updatedAt: Date;
  boundary: Record<string, unknown>;
}

export interface ZoneLocationResult {
  id: string;
  name: string;
  nameAr: string | null;
  isActive: boolean;
  baseDeliveryFeeOverride: number | null;
  minOrderAmountOverride: number | null;
}

@Injectable()
export class ZonesService {
  private readonly logger = new Logger(ZonesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createZone(dto: CreateZoneDto) {
    const id = crypto.randomUUID();

    const geoJson = JSON.stringify({
      type: 'Polygon',
      coordinates: dto.boundary,
    });

    try {
      await this.prisma.$executeRaw`
        INSERT INTO "zones" (
          "id", "name", "nameAr", "isActive", 
          "baseDeliveryFeeOverride", "minOrderAmountOverride", 
          "boundary", "createdAt", "updatedAt"
        ) VALUES (
          ${id}, 
          ${dto.name}, 
          ${dto.nameAr ?? null}, 
          ${dto.isActive ?? true}, 
          ${dto.baseDeliveryFeeOverride ?? null}, 
          ${dto.minOrderAmountOverride ?? null}, 
          ST_SetSRID(ST_GeomFromGeoJSON(${geoJson}), 4326), 
          NOW(), 
          NOW()
        );
      `;

      return await this.getZoneById(id);
    } catch (error: unknown) {
      throw new BadRequestException(ZoneErrors.INVALID_BOUNDARY);
    }
  }

  async getAllZones(): Promise<ZoneQueryResult[]> {
    const zones = await this.prisma.$queryRaw<ZoneQueryResult[]>`
      SELECT 
        "id", "name", "nameAr", "isActive", 
        "baseDeliveryFeeOverride", "minOrderAmountOverride",
        "createdAt", "updatedAt",
        ST_AsGeoJSON("boundary")::json AS boundary
      FROM "zones"
      ORDER BY "createdAt" DESC;
    `;
    return zones;
  }

  async getZoneById(id: string): Promise<ZoneQueryResult> {
    const zones = await this.prisma.$queryRaw<ZoneQueryResult[]>`
      SELECT 
        "id", "name", "nameAr", "isActive", 
        "baseDeliveryFeeOverride", "minOrderAmountOverride",
        "createdAt", "updatedAt",
        ST_AsGeoJSON("boundary")::json AS boundary
      FROM "zones"
      WHERE "id" = ${id};
    `;

    if (!zones || zones.length === 0) {
      throw new NotFoundException(ZoneErrors.NOT_FOUND);
    }

    return zones[0];
  }

  async findZoneByLocation(dto: CheckLocationDto): Promise<ZoneLocationResult> {
    const zones = await this.prisma.$queryRaw<ZoneLocationResult[]>`
      SELECT 
        "id", "name", "nameAr", "isActive",
        "baseDeliveryFeeOverride", "minOrderAmountOverride"
      FROM "zones"
      WHERE ST_Contains("boundary", ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326))
      AND "isActive" = true
      ORDER BY ST_Area("boundary") ASC
      LIMIT 1;
    `;

    if (!zones || zones.length === 0) {
      throw new NotFoundException(ZoneErrors.NOT_FOUND);
    }

    return zones[0];
  }

  async updateZone(id: string, dto: UpdateZoneDto): Promise<ZoneQueryResult> {
    await this.getZoneById(id);

    if (dto.boundary) {
      const geoJson = JSON.stringify({
        type: 'Polygon',
        coordinates: dto.boundary,
      });

      try {
        await this.prisma.$executeRaw`
          UPDATE "zones" SET 
            "boundary" = ST_SetSRID(ST_GeomFromGeoJSON(${geoJson}), 4326),
            "updatedAt" = NOW()
          WHERE "id" = ${id};
        `;
      } catch (error: unknown) {
        throw new BadRequestException(ZoneErrors.INVALID_BOUNDARY);
      }
    }

    const { boundary: _boundary, ...standardFields } = dto;

    if (Object.keys(standardFields).length > 0) {
      await this.prisma.zone.update({
        where: { id },
        data: standardFields,
      });
    }

    return this.getZoneById(id);
  }

  async deleteZone(id: string) {
    await this.getZoneById(id);

    await this.prisma.zone.delete({ where: { id } });

    return { message: CommonSuccess.RESOURCE_DELETED };
  }

  async searchCustomersInPolygon(dto: SearchCustomersInPolygonDto) {
    const geoJson = JSON.stringify({
      type: 'Polygon',
      coordinates: dto.polygon,
    });

    try {
      const customers = await this.prisma.$queryRaw`
        SELECT 
          c.id as "customerId", 
          u.name as "customerName", 
          u.email, 
          u.phone,
          c."createdAt" as "registrationDate",
          (SELECT COUNT(*)::int FROM "orders" o WHERE o."customerId" = c.id AND o."deletedAt" IS NULL) as "ordersCount",
          (SELECT MAX("createdAt") FROM "orders" o WHERE o."customerId" = c.id AND o."deletedAt" IS NULL) as "lastOrderDate",
          json_agg(
            json_build_object(
              'id', a.id,
              'label', a.label,
              'address', a.address,
              'isDefault', a."isDefault",
              'location', ST_AsGeoJSON(a."location")::json
            )
          ) as "matchedAddresses"
        FROM "customers" c
        JOIN "users" u ON c."userId" = u.id
        JOIN "addresses" a ON a."customerId" = c.id
        WHERE ST_Within(a."location", ST_SetSRID(ST_GeomFromGeoJSON(${geoJson}), 4326))
        GROUP BY c.id, u.id
      `;

      return {
        count: Array.isArray(customers) ? customers.length : 0,
        customers: customers,
      };
    } catch (error: unknown) {
      this.logger.error('Error searching customers in polygon', error);
      throw new BadRequestException(ZoneErrors.INVALID_POLYGON);
    }
  }
}
