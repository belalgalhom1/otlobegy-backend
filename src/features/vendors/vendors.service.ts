import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { StorageService } from 'src/infrastructure/storage/storage.service';
import { PlatformSettingsService } from 'src/features/platform-settings/platform-settings.service';
import {
  CreateVendorDto,
  UpdateVendorDto,
  UpdateVendorStatusDto,
  QueryVendorsDto,
} from './dto/vendor.dto';
import { Prisma } from '@prisma/client';
import { randomBytes, randomUUID } from 'crypto';

import {
  CommonSuccess,
  VendorErrors,
} from 'src/common/constants/response.constants';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly platformSettings: PlatformSettingsService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // ─── Admin: create ────────────────────────────────────────────────────────

  async create(dto: CreateVendorDto) {
    const base =
      dto.storeName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80) || 'vendor';

    let slug = base;
    let attempts = 0;
    
    const settings = await this.platformSettings.getSettings();

    while (attempts < 5) {
      try {
        return await this.prisma.vendor.create({
          data: {
            storeName: dto.storeName,
            storeNameAr: dto.storeNameAr ?? null,
            slug,
            description: dto.description ?? null,
            descriptionAr: dto.descriptionAr ?? null,
            verticalId: dto.verticalId,
            taxId: dto.taxId ?? null,
            commissionRate: dto.commissionRate ?? settings.defaultCommissionRate,
            phone: dto.phone ?? null,
            isContracted: dto.isContracted ?? false,
            workingHours: dto.workingHours ?? Prisma.DbNull,
            is24Hours: dto.is24Hours ?? false,
          },
          include: this.vendorIncludes(),
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          if (attempts === 4) {
            slug = `${base}-${randomUUID()}`;
          } else {
            slug = `${base}-${randomBytes(3).toString('hex')}`;
          }
          attempts++;
          continue;
        }
        throw error;
      }
    }
    throw new ConflictException(VendorErrors.UNABLE_TO_GENERATE_SLUG);
  }

  // ─── Public / member: list ─────────────────────────────────────────────────

  async findAll(dto: QueryVendorsDto) {
    const { page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.VendorWhereInput = { deletedAt: null };

    if (dto.status) where.status = dto.status;
    if (dto.verticalId) where.verticalId = dto.verticalId;
    if (dto.search) {
      where.OR = [
        { storeName: { contains: dto.search, mode: 'insensitive' } },
        { storeNameAr: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    if (dto.minRating) {
      where.rating = { gte: dto.minRating };
    }

    let vendors: any[] = [];
    let total = 0;

    if (dto.lat !== undefined && dto.lng !== undefined && !dto.sortBy) {
      // 1. Resolve containing delivery zone, fallback to closest active zone
      let targetZoneId: string | null = null;
      try {
        const containingZoneRows = await this.prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM zones
          WHERE ST_Contains(boundary, ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326))
            AND "isActive" = true
          ORDER BY ST_Area(boundary) ASC
          LIMIT 1
        `;
        targetZoneId = containingZoneRows[0]?.id ?? null;

        if (!targetZoneId) {
          const closestZoneRows = await this.prisma.$queryRaw<{ id: string }[]>`
            SELECT id FROM zones
            WHERE "isActive" = true
            ORDER BY ST_Distance(boundary::geography, ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography) ASC
            LIMIT 1
          `;
          targetZoneId = closestZoneRows[0]?.id ?? null;
        }
      } catch (err) {
        this.logger.warn(`Zone resolution failed: ${err}`);
      }

      // 2. Fetch best branch per vendor ranked by: inZone -> isOpen -> geodesic distance
      type NearestBranchRow = {
        vendorId: string;
        branchId: string;
        branchName: string;
        branchNameAr: string | null;
        branchAddress: string;
        branchIsOpen: boolean;
        branchZoneId: string;
        inZone: boolean;
        distanceKm: number;
      };

      let nearestBranches: NearestBranchRow[] = [];
      try {
        nearestBranches = await this.prisma.$queryRaw<NearestBranchRow[]>`
          WITH ranked_branches AS (
            SELECT
              vb."vendorId",
              vb.id AS "branchId",
              vb.name AS "branchName",
              vb."nameAr" AS "branchNameAr",
              vb.address AS "branchAddress",
              vb."isOpen" AS "branchIsOpen",
              vb."zoneId" AS "branchZoneId",
              ${targetZoneId ? Prisma.sql`(vb."zoneId" = ${targetZoneId})` : Prisma.sql`false`} AS "inZone",
              ROUND((ST_Distance(vb.location::geography, ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography) / 1000.0)::numeric, 1)::float AS "distanceKm",
              ROW_NUMBER() OVER (
                PARTITION BY vb."vendorId"
                ORDER BY
                  (CASE WHEN ${targetZoneId ? Prisma.sql`vb."zoneId" = ${targetZoneId}` : Prisma.sql`false`} THEN 0 ELSE 1 END) ASC,
                  (CASE WHEN vb."isOpen" = true THEN 0 ELSE 1 END) ASC,
                  ST_Distance(vb.location::geography, ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography) ASC
              ) AS rank
            FROM vendor_branches vb
            JOIN vendors v ON v.id = vb."vendorId"
            WHERE v."deletedAt" IS NULL
          )
          SELECT
            "vendorId",
            "branchId",
            "branchName",
            "branchNameAr",
            "branchAddress",
            "branchIsOpen",
            "branchZoneId",
            "inZone",
            "distanceKm"
          FROM ranked_branches
          WHERE rank = 1
          ORDER BY
            "inZone" DESC,
            "branchIsOpen" DESC,
            "distanceKm" ASC
        `;
      } catch (err) {
        this.logger.warn(`Nearest branch query failed: ${err}`);
      }

      // Fetch all vendors matching where filter
      const matchingVendors = await this.prisma.vendor.findMany({
        where,
        include: this.vendorIncludes(),
      });

      const vendorMap = new Map(matchingVendors.map((v) => [v.id, v]));

      // Merge sorted branches with vendor data
      const sortedVendorsWithBranches: any[] = [];
      for (const branch of nearestBranches) {
        const vendor = vendorMap.get(branch.vendorId);
        if (vendor) {
          sortedVendorsWithBranches.push({
            ...vendor,
            _proximity: {
              distanceKm: branch.distanceKm,
              inCustomerZone: branch.inZone,
              closestBranch: {
                id: branch.branchId,
                name: branch.branchName,
                nameAr: branch.branchNameAr,
                address: branch.branchAddress,
                isOpen: branch.branchIsOpen,
                zoneId: branch.branchZoneId,
                distanceKm: branch.distanceKm,
              },
            },
          });
          vendorMap.delete(branch.vendorId);
        }
      }

      // Any remaining matching vendors without branches are appended at the end
      const remainingVendorsWithoutBranches = Array.from(vendorMap.values());
      const combinedSortedVendors = [
        ...sortedVendorsWithBranches,
        ...remainingVendorsWithoutBranches,
      ];

      total = combinedSortedVendors.length;
      vendors = combinedSortedVendors.slice(skip, skip + limit);
    } else {
      const orderBy: Prisma.VendorOrderByWithRelationInput = {};
      if (dto.sortBy) {
        orderBy[dto.sortBy] = dto.sortOrder || 'desc';
      } else {
        orderBy.createdAt = 'desc';
      }

      const [v, t] = await Promise.all([
        this.prisma.vendor.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: this.vendorIncludes(),
        }),
        this.prisma.vendor.count({ where }),
      ]);
      vendors = v;
      total = t;
    }

    return {
      vendors: vendors.map((v) => this.mapVendorForApp(v)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async adminFindAll(dto: QueryVendorsDto) {
    const { page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.VendorWhereInput = {}; // Admins can see deleted vendors

    if (dto.status) where.status = dto.status;
    if (dto.verticalId) where.verticalId = dto.verticalId;
    if (dto.search) {
      where.OR = [
        { storeName: { contains: dto.search, mode: 'insensitive' } },
        { storeNameAr: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    if (dto.minRating) {
      where.rating = { gte: dto.minRating };
    }

    const orderBy: Prisma.VendorOrderByWithRelationInput = {};
    if (dto.sortBy) {
      orderBy[dto.sortBy] = dto.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: this.vendorIncludes(),
      }),
      this.prisma.vendor.count({ where }),
    ]);

    return {
      vendors: vendors.map((v) => this.mapVendorForApp(v)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const cacheKey = `vendor_details_${id}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached as Record<string, unknown>;

    const vendor = await this.prisma.vendor.findFirst({
      where: { id, deletedAt: null },
      include: this.vendorDetailsIncludes(),
    });
    if (!vendor) throw new NotFoundException(VendorErrors.NOT_FOUND);
    const mapped = this.mapVendorForApp(vendor);
    await this.cacheManager.set(cacheKey, mapped, 300000); // 5 mins
    return mapped;
  }

  async findBySlug(slug: string) {
    const cacheKey = `vendor_slug_details_${slug}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached as Record<string, unknown>;

    const vendor = await this.prisma.vendor.findFirst({
      where: { slug, deletedAt: null },
      include: this.vendorDetailsIncludes(),
    });
    if (!vendor) throw new NotFoundException(VendorErrors.NOT_FOUND);
    const mapped = this.mapVendorForApp(vendor);
    await this.cacheManager.set(cacheKey, mapped, 300000); // 5 mins
    return mapped;
  }

  // ─── Admin: update ────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateVendorDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      select: { deletedAt: true, slug: true },
    });
    if (!vendor || vendor.deletedAt)
      throw new NotFoundException(VendorErrors.NOT_FOUND);

    // If storeName changes and no explicit slug change is needed,
    // we do NOT auto-regenerate the slug to avoid breaking existing URLs.
    // Slug is immutable after creation unless the admin explicitly sets it
    // via a dedicated endpoint (not implemented — intentional).

    const updated = await this.prisma.vendor.update({
      where: { id },
      data: {
        ...(dto.storeName !== undefined && { storeName: dto.storeName }),
        ...(dto.storeNameAr !== undefined && { storeNameAr: dto.storeNameAr }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.descriptionAr !== undefined && {
          descriptionAr: dto.descriptionAr,
        }),
        ...(dto.verticalId !== undefined && { verticalId: dto.verticalId }),
        ...(dto.taxId !== undefined && { taxId: dto.taxId }),
        ...(dto.commissionRate !== undefined && {
          commissionRate: dto.commissionRate,
        }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.isContracted !== undefined && {
          isContracted: dto.isContracted,
        }),
        ...(dto.workingHours !== undefined && {
          workingHours: dto.workingHours,
        }),
        ...(dto.workingHours !== undefined && dto.isScheduleActive === undefined && {
          isScheduleActive: true, // Auto-enable if working hours are modified and flag isn't explicitly passed
        }),
        ...(dto.isScheduleActive !== undefined && {
          isScheduleActive: dto.isScheduleActive,
        }),
        ...(dto.is24Hours !== undefined && {
          is24Hours: dto.is24Hours,
        }),
      },
      include: this.vendorIncludes(),
    });
    await this.cacheManager.del(`vendor_details_${id}`);
    if (vendor?.slug)
      await this.cacheManager.del(`vendor_slug_details_${vendor.slug}`);
    return updated;
  }

  async searchDiscovery(dto: QueryVendorsDto) {
    const { search, verticalId, limit = 20 } = dto;
    if (!search) return { results: [] };

    // 1. Find products matching the search
    const products = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { nameAr: { contains: search, mode: 'insensitive' } },
        ],
        vendor: {
          verticalId: verticalId || undefined,
          deletedAt: null,
          rating: dto.minRating ? { gte: dto.minRating } : undefined,
        },
      },
      take: limit * 2,
      include: {
        vendor: {
          include: this.vendorIncludes(),
        },
      },
    });

    // 2. Group by vendor
    const vendorMap = new Map<string, any>();

    for (const p of products) {
      if (!vendorMap.has(p.vendorId)) {
        vendorMap.set(p.vendorId, {
          ...this.mapVendorForApp(p.vendor),
          matchingProducts: [],
        });
      }
      vendorMap.get(p.vendorId).matchingProducts.push({
        id: p.id,
        name: p.name,
        nameAr: p.nameAr,
        description: p.description,
        price: p.basePrice,
        image: p.imageUrl,
        sellByStrip: (p.vendor.vertical?.slug?.toLowerCase().includes('pharmacy') || p.vendor.vertical?.slug?.toLowerCase().includes('pharmacies') || p.vendor.vertical?.slug?.includes('صيدلي') || false) ? p.sellByStrip : false,
        stripsPerPackage: p.stripsPerPackage,
      });
    }

    // 3. Also find vendors whose name matches the search directly
    const directVendors = await this.prisma.vendor.findMany({
      where: {
        deletedAt: null,
        verticalId: verticalId || undefined,
        rating: dto.minRating ? { gte: dto.minRating } : undefined,
        OR: [
          { storeName: { contains: search, mode: 'insensitive' } },
          { storeNameAr: { contains: search, mode: 'insensitive' } },
        ],
      },
      take: limit,
      include: this.vendorIncludes(),
    });

    for (const v of directVendors) {
      if (!vendorMap.has(v.id)) {
        vendorMap.set(v.id, {
          ...this.mapVendorForApp(v),
          matchingProducts: [],
        });
      }
    }

    if (dto.lat !== undefined && dto.lng !== undefined && vendorMap.size > 0) {
      try {
        const vendorIds = Array.from(vendorMap.keys());
        const branchDistances = await this.prisma.$queryRaw<{ vendorId: string; distanceKm: number }[]>`
          SELECT
            vb."vendorId",
            ROUND((MIN(ST_Distance(vb.location::geography, ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography)) / 1000.0)::numeric, 1)::float AS "distanceKm"
          FROM vendor_branches vb
          WHERE vb."vendorId" IN (${Prisma.join(vendorIds)})
          GROUP BY vb."vendorId"
        `;
        const distanceMap = new Map(branchDistances.map((b) => [b.vendorId, b.distanceKm]));
        const sortedResults = Array.from(vendorMap.values())
          .map((v) => {
            const d = distanceMap.get(v.id);
            if (d !== undefined) {
              v.distanceKm = d;
              const baseMin = Math.max(15, Math.round(15 + d * 2.5));
              const baseMax = baseMin + 10;
              v.deliveryTime = `${baseMin}-${baseMax} دقيقة`;
              v.deliveryTimeEn = `${baseMin}-${baseMax} mins`;
            }
            return v;
          })
          .sort((a, b) => {
            const da = a.distanceKm ?? 9999;
            const db = b.distanceKm ?? 9999;
            return da - db;
          });

        return { results: sortedResults };
      } catch (err) {
        this.logger.warn(`Discovery search proximity sorting failed: ${err}`);
      }
    }

    return {
      results: Array.from(vendorMap.values()),
    };
  }

  async updateStatus(id: string, dto: UpdateVendorStatusDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      select: { deletedAt: true, slug: true },
    });
    if (!vendor || vendor.deletedAt)
      throw new NotFoundException(VendorErrors.NOT_FOUND);

    const updated = await this.prisma.vendor.update({
      where: { id },
      data: { status: dto.status, isScheduleActive: false },
      include: this.vendorIncludes(),
    });
    await this.cacheManager.del(`vendor_details_${id}`);
    if (vendor?.slug)
      await this.cacheManager.del(`vendor_slug_details_${vendor.slug}`);
    return updated;
  }

  // ─── Admin: logo & cover image ────────────────────────────────────────────

  async uploadLogo(id: string, file: Express.Multer.File) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      select: { deletedAt: true, logo: true },
    });
    if (!vendor || vendor.deletedAt)
      throw new NotFoundException(VendorErrors.NOT_FOUND);

    const logoUrl = await this.storage.upload(file, 'vendors/logos');
    this.logger.log(`Logo uploaded for vendor ${id}: ${logoUrl}`);

    await this.prisma.vendor.update({
      where: { id },
      data: { logo: logoUrl },
    });

    // Delete old logo only AFTER successful DB update to prevent orphans on crash
    if (vendor.logo) {
      await this.storage.delete(vendor.logo).catch((err) => {
        this.logger.warn(
          `Failed to delete old logo for vendor ${id}: ${err.message}`,
        );
      });
    }

    await this.cacheManager.del(`vendor_details_${id}`);

    return { logo: logoUrl };
  }

  async uploadCover(id: string, file: Express.Multer.File) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      select: { deletedAt: true, coverImage: true },
    });
    if (!vendor || vendor.deletedAt)
      throw new NotFoundException(VendorErrors.NOT_FOUND);

    const coverUrl = await this.storage.upload(file, 'vendors/covers');
    this.logger.log(`Cover uploaded for vendor ${id}: ${coverUrl}`);

    await this.prisma.vendor.update({
      where: { id },
      data: { coverImage: coverUrl },
    });

    // Delete old cover only AFTER successful DB update to prevent orphans on crash
    if (vendor.coverImage) {
      await this.storage.delete(vendor.coverImage).catch((err) => {
        this.logger.warn(
          `Failed to delete old cover for vendor ${id}: ${err.message}`,
        );
      });
    }

    await this.cacheManager.del(`vendor_details_${id}`);

    return { coverImage: coverUrl };
  }

  // ─── Admin: soft delete ───────────────────────────────────────────────────

  async remove(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      select: { deletedAt: true },
    });
    if (!vendor || vendor.deletedAt)
      throw new NotFoundException(VendorErrors.NOT_FOUND);

    await this.prisma.vendor.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: CommonSuccess.RESOURCE_DELETED };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private vendorIncludes() {
    return {
      vertical: {
        select: {
          id: true,
          name: true,
          nameAr: true,
          slug: true,
          iconUrl: true,
        },
      },
      _count: {
        select: {
          orders: true,
        },
      },
    };
  }

  private vendorDetailsIncludes() {
    return {
      ...this.vendorIncludes(),
      categories: {
        where: { isActive: true },
        orderBy: { sortOrder: Prisma.SortOrder.asc },
      },
      products: {
        where: { isActive: true, deletedAt: null },
        include: {
          variants: {
            where: { isActive: true },
            include: {
              optionGroups: {
                include: {
                  options: {
                    where: { isActive: true },
                    orderBy: { name: Prisma.SortOrder.asc },
                  },
                },
              },
            },
            orderBy: { name: Prisma.SortOrder.asc },
          },
          optionGroups: {
            include: {
              options: {
                where: { isActive: true },
                orderBy: { name: Prisma.SortOrder.asc },
              },
            },
          },
        },
      },
    };
  }

  private checkIfCurrentlyOpen(workingHours: unknown): boolean {
    if (
      !workingHours ||
      !Array.isArray(workingHours) ||
      workingHours.length === 0
    ) {
      return true;
    }

    try {
      // OtlobEgy operates in Egypt; enforce Cairo timezone for accurate store hours
      const cairoTimeStr = new Date().toLocaleString('en-US', {
        timeZone: 'Africa/Cairo',
      });
      const now = new Date(cairoTimeStr);
      const todayDay = now.getDay();

      const todaySchedule = workingHours.find(
        (h) => Number(h.day) === todayDay,
      );
      if (!todaySchedule) return true;

      const isClosed =
        todaySchedule.isClosed === true || todaySchedule.isClosed === 'true';
      if (isClosed) return false;

      const openTimeStr =
        typeof todaySchedule.openTime === 'string'
          ? todaySchedule.openTime
          : '09:00';
      const closeTimeStr =
        typeof todaySchedule.closeTime === 'string'
          ? todaySchedule.closeTime
          : '22:00';

      const [openHour, openMin] = openTimeStr.split(':').map(Number);
      const [closeHour, closeMin] = closeTimeStr.split(':').map(Number);

      const currentHour = now.getHours();
      const currentMin = now.getMinutes();

      const openMinutes = openHour * 60 + openMin;
      const closeMinutes = closeHour * 60 + closeMin;
      const currentMinutes = currentHour * 60 + currentMin;

      if (closeMinutes < openMinutes) {
        return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
      }
      return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
    } catch (error) {
      return false; // Fail-closed on corrupted json
    }
  }

  private mapVendorForApp(vendor: {
    id: string;
    status: string;
    storeName: string;
    storeNameAr: string | null;
    slug: string;
    description: string | null;
    descriptionAr: string | null;
    workingHours: Prisma.JsonValue;
    coverImage: string | null;
    logo: string | null;
    isScheduleActive: boolean;
    rating?: number | null;
    ratingCount?: number | null;
    vertical?: { name: string; nameAr: string | null; slug: string } | null;
    products?: {
      id: string;
      name: string;
      nameAr: string | null;
      description: string | null;
      descriptionAr: string | null;
      basePrice: number | null;
      imageUrl: string | null;
      categoryId: string | null;
      sellByStrip: boolean;
      stripsPerPackage: number | null;
      hasVariants: boolean;
      variants: unknown[];
      optionGroups: unknown[];
    }[];
  }) {
    let status = vendor.status;
    let isClosedBySchedule = false;

    if (vendor.status === 'OPEN' && vendor.workingHours) {
      const isOpen = this.checkIfCurrentlyOpen(vendor.workingHours);
      if (!isOpen) {
        status = 'CLOSED';
        isClosedBySchedule = true;
      }
    }

    const proximity = (vendor as any)._proximity;
    const distanceKm: number | null = proximity?.distanceKm ?? (vendor as any).distanceKm ?? null;
    const inCustomerZone: boolean = proximity?.inCustomerZone ?? false;
    const closestBranch = proximity?.closestBranch ?? null;

    let deliveryTime = '20-30 دقيقة';
    let deliveryTimeEn = '20-30 mins';
    if (distanceKm !== null && distanceKm > 0) {
      const baseMin = Math.max(15, Math.round(15 + distanceKm * 2.5));
      const baseMax = baseMin + 10;
      deliveryTime = `${baseMin}-${baseMax} دقيقة`;
      deliveryTimeEn = `${baseMin}-${baseMax} mins`;
    }

    // Map backend fields to what the app expects
    return {
      ...vendor,
      status,
      manualStatus: vendor.status,
      isClosedBySchedule,
      id: vendor.id,
      name: vendor.storeName,
      nameAr: vendor.storeNameAr || '',
      vendor: vendor.description || vendor.vertical?.name || '',
      vendorAr: vendor.descriptionAr || vendor.vertical?.nameAr || '',
      rating: vendor.rating ?? 0,
      ratingCount: vendor.ratingCount ?? 0,
      distanceKm,
      inCustomerZone,
      closestBranch,
      deliveryTime,
      deliveryTimeEn,
      deliveryFee: '15 ج رسوم توصيل',
      image:
        vendor.coverImage ||
        vendor.logo ||
        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop',
      type: vendor.vertical?.slug || 'restaurant',
      isScheduleActive: vendor.isScheduleActive,
      tag: status === 'OPEN' ? 'Open' : 'Closed',
      menu:
        vendor.products?.map((p) => {
          const slug = vendor.vertical?.slug?.toLowerCase() || '';
          const name = vendor.vertical?.name?.toLowerCase() || '';
          const nameAr = vendor.vertical?.nameAr || '';
          const vendorSlug = vendor.slug?.toLowerCase() || '';
          const storeName = vendor.storeName?.toLowerCase() || '';
          const isPharmacy = slug.includes('pharmacy') || slug.includes('pharmacies') || slug.includes('pharmacies-') || slug.includes('صيدلي') || slug.includes('صيدليات') || slug.includes('medical') || slug.includes('medicine') || slug.includes('pharma') ||
                             name.includes('pharmacy') || name.includes('pharmacies') || name.includes('medical') || name.includes('medicine') || name.includes('pharma') || nameAr.includes('صيدلي') || nameAr.includes('صيدليات') ||
                             vendorSlug.includes('pharmacy') || vendorSlug.includes('صيدلي') || vendorSlug.includes('صيدليات') || storeName.includes('pharmacy') || storeName.includes('صيدلي') || storeName.includes('صيدليات') || false;
          return {
            id: p.id,
            name: p.name,
            nameAr: p.nameAr || '',
            description: p.description,
            descriptionAr: p.descriptionAr || '',
            price: p.basePrice ? Number(p.basePrice) : 0,
            image: p.imageUrl || '',
            category: p.categoryId, // Link to category
            sellByStrip: isPharmacy ? p.sellByStrip : false,
            stripsPerPackage: p.stripsPerPackage,
            hasVariants: p.hasVariants,
            variants: p.variants || [],
            optionGroups: p.optionGroups || [],
          };
        }) || [],
    };
  }
}
