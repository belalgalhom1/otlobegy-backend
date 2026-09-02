import { Controller, Post, Get, Query, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../../common/interfaces/jwt-payload.interface';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '@prisma/client';
import { PaginatedReviewsResponseDto } from './dto/review.dto';

@ApiTags('Reviews')
@ApiBearerAuth()
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ─── Customer: submit a review ──────────────────────────────────────────────

  @Post('order/:orderId')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a rating/review for a delivered order' })
  @ApiResponse({ status: 200, description: 'Review submitted successfully' })
  @ApiResponse({ status: 400, description: 'Order not delivered or already rated' })
  @ApiResponse({ status: 404, description: 'Order not found' })
    @ApiStandardResponse()
  async submitReview(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('orderId') orderId: string,
    @Body() dto: CreateReviewDto,
  ): Promise<void> {
    return this.reviewsService.submitReview(actor, orderId, dto);
  }

  // ─── Public: vendor reviews ─────────────────────────────────────────────────

  @Public()
  @Get('vendor/:vendorId')
  @ApiOperation({ summary: 'Get paginated reviews for a specific vendor' })
  @ApiStandardResponse(PaginatedReviewsResponseDto)
  async getVendorReviews(
    @Param('vendorId') vendorId: string,
    @Query() dto: QueryReviewsDto,
  ) {
    return this.reviewsService.getVendorReviews(vendorId, dto.page, dto.limit);
  }

  // ─── Driver: view own reviews ───────────────────────────────────────────────

  @Get('driver/me')
  @UseGuards(RolesGuard)
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Driver views their own reviews' })
  @ApiStandardResponse(PaginatedReviewsResponseDto)
  async getMyDriverReviews(
    @CurrentUser() actor: JwtAccessPayload,
    @Query() dto: QueryReviewsDto,
  ) {
    return this.reviewsService.getDriverReviews(actor.sub, dto.page, dto.limit);
  }

  // ─── Admin: view any driver's reviews (permission-gated) ────────────────────

  @Get('driver/:driverId')
  @RequirePermissions(Permission.MANAGE_DRIVERS)
  @ApiOperation({ summary: '[Admin] Get paginated reviews for a specific driver' })
  @ApiStandardResponse(PaginatedReviewsResponseDto)
  async getDriverReviews(
    @Param('driverId') driverId: string,
    @Query() dto: QueryReviewsDto,
  ) {
    return this.reviewsService.getDriverReviews(driverId, dto.page, dto.limit);
  }
}
