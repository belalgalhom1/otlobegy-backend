import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateVendorBranchDto,
  UpdateVendorBranchDto,
} from './dto/vendor-branch.dto';
import {
  VendorBranchErrors,
  VendorErrors,
  ZoneErrors,
  CommonSuccess,
} from '../../../common/constants/response.constants';
import * as crypto from 'crypto';

@Injectable()
export class VendorBranchesService {
  private readonly logger = new Logger(VendorBranchesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── List all branches of a vendor ────────────────────────────────────────

  async findAll(vendorId: string) {
    await this.assertVendorExists(vendorId);

    // Raw SQL to include the PostGIS location as GeoJSON — same pattern as
    // addresses and zones in this codebase.
    return this.prisma.$queryRaw<any[]>`
      SELECT
        vb.id,
        vb.name,
        vb."nameAr",
        vb.address,
        vb.phone,
        vb."isOpen",
        vb."vendorId",
        vb."zoneId",
        vb."createdAt",
        vb."updatedAt",
        ST_AsGeoJSON(vb.location)::json AS location,
        json_build_object(
          'id',   z.id,
          'name', z.name
        ) AS zone
      FROM vendor_branches vb
      LEFT JOIN zones z ON z.id = vb."zoneId"
      WHERE vb."vendorId" = ${vendorId}
      ORDER BY vb."createdAt" ASC
    `;
  }

  // ─── Get single branch ────────────────────────────────────────────────────

  async findOne(vendorId: string, branchId: string) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        vb.id,
        vb.name,
        vb."nameAr",
        vb.address,
        vb.phone,
        vb."isOpen",
        vb."vendorId",
        vb."zoneId",
        vb."createdAt",
        vb."updatedAt",
        ST_AsGeoJSON(vb.location)::json AS location,
        json_build_object(
          'id',   z.id,
          'name', z.name
        ) AS zone
      FROM vendor_branches vb
      LEFT JOIN zones z ON z.id = vb."zoneId"
      WHERE vb.id = ${branchId}
        AND vb."vendorId" = ${vendorId}
    `;

    if (!rows.length) throw new NotFoundException(VendorBranchErrors.NOT_FOUND);
    return rows[0];
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(vendorId: string, dto: CreateVendorBranchDto) {
    await this.assertVendorExists(vendorId);

    const [lat, lng] = dto.location;
    let resolvedZoneId = dto.zoneId;

    if (!resolvedZoneId) {
      const zoneResult = await this.prisma.$queryRaw<any[]>`
        SELECT id FROM zones
        WHERE ST_Contains(boundary, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
        AND "isActive" = true
        LIMIT 1
      `;
      if (!zoneResult.length) {
        throw new BadRequestException(ZoneErrors.INVALID_LOCATION_FOR_ZONE);
      }
      resolvedZoneId = zoneResult[0].id;
    } else {
      await this.validateLocationInZone(resolvedZoneId, dto.location);
    }

    const id = crypto.randomUUID();

    await this.prisma.$executeRaw`
      INSERT INTO vendor_branches (
        id, "vendorId", name, "nameAr", address, phone, "isOpen",
        location, "zoneId", "updatedAt"
      ) VALUES (
        ${id},
        ${vendorId},
        ${dto.name},
        ${dto.nameAr ?? null},
        ${dto.address},
        ${dto.phone ?? null},
        ${dto.isOpen ?? true},
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
        ${resolvedZoneId},
        NOW()
      )
    `;

    this.logger.log(`Branch ${id} created for vendor ${vendorId}`);
    return this.findOne(vendorId, id);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(vendorId: string, branchId: string, dto: UpdateVendorBranchDto) {
    const branch = await this.findOne(vendorId, branchId); // 404 if not found

    let finalZoneId = dto.zoneId !== undefined ? dto.zoneId : branch.zoneId;
    const finalLocation =
      dto.location !== undefined ? dto.location : branch.location?.coordinates;

    if (dto.location && dto.zoneId === undefined) {
      const [lat, lng] = dto.location;
      const zoneResult = await this.prisma.$queryRaw<any[]>`
        SELECT id FROM zones
        WHERE ST_Contains(boundary, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
        AND "isActive" = true
        LIMIT 1
      `;
      if (!zoneResult.length) {
        throw new BadRequestException(ZoneErrors.INVALID_LOCATION_FOR_ZONE);
      }
      finalZoneId = zoneResult[0].id;
    } else if (finalZoneId && finalLocation) {
      // If either location or zone explicitly changed, validate it
      if (dto.zoneId !== undefined || dto.location !== undefined) {
        await this.validateLocationInZone(finalZoneId, finalLocation);
      }
    }

    // Update location via raw SQL when provided; otherwise keep existing.
    if (dto.location) {
      const [lat, lng] = dto.location;
      await this.prisma.$executeRaw`
        UPDATE vendor_branches
        SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
            "updatedAt" = NOW()
        WHERE id = ${branchId} AND "vendorId" = ${vendorId}
      `;
    }

    // Update the remaining scalar fields through Prisma ORM.
    const { location, ...scalarFields } = dto;

    if (Object.keys(scalarFields).length > 0 || finalZoneId !== branch.zoneId) {
      await this.prisma.vendorBranch.update({
        where: { id: branchId },
        data: {
          ...(scalarFields.name !== undefined && { name: scalarFields.name }),
          ...(scalarFields.nameAr !== undefined && {
            nameAr: scalarFields.nameAr,
          }),
          ...(scalarFields.address !== undefined && {
            address: scalarFields.address,
          }),
          ...(scalarFields.phone !== undefined && {
            phone: scalarFields.phone,
          }),
          ...(scalarFields.isOpen !== undefined && {
            isOpen: scalarFields.isOpen,
          }),
          ...(finalZoneId !== undefined && {
            zoneId: finalZoneId,
          }),
        },
      });
    }

    return this.findOne(vendorId, branchId);
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async remove(vendorId: string, branchId: string) {
    await this.findOne(vendorId, branchId);

    await this.prisma.vendorBranch.delete({ where: { id: branchId } });

    this.logger.log(`Branch ${branchId} deleted from vendor ${vendorId}`);
    return { message: CommonSuccess.RESOURCE_DELETED };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async assertVendorExists(vendorId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, deletedAt: null },
      select: { id: true },
    });
    if (!vendor) throw new NotFoundException(VendorErrors.NOT_FOUND);
  }

  private async validateLocationInZone(
    zoneId: string,
    location: [number, number],
  ) {
    const [lat, lng] = location;
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM zones
      WHERE id = ${zoneId}
      AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
      LIMIT 1
    `;
    if (!result.length) {
      throw new BadRequestException(ZoneErrors.INVALID_LOCATION_FOR_ZONE);
    }
  }
}
