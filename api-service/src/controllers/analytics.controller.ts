import { Controller, Get, Post, Body, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { BaseController } from './base.controller';
import { AnalyticsService } from '../services/analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController extends BaseController {
  constructor(private readonly analyticsService: AnalyticsService) {
    super();
  }

  @Post('track/impression')
  @ApiOperation({ summary: 'Track content impression' })
  async trackImpression(
    @Body() body: {
      contentId: string;
      campaignId: string;
      placementId: string;
      userId: string;
      sessionId: string;
      deviceInfo: any;
    },
    @Req() req: Request
  ) {
    try {
      const tenantContext = this.getTenantContext(req);

      const success = await this.analyticsService.trackImpression(
        body.contentId,
        body.campaignId,
        body.placementId,
        body.userId,
        body.sessionId,
        body.deviceInfo,
        tenantContext.tenantId,
      );

      return this.successResponse({ tracked: success });
    } catch (error: any) {
      return this.errorResponse(
        `Failed to track impression: ${error.message}`,
        'IMPRESSION_TRACKING_FAILED'
      );
    }
  }

  @Post('track/click')
  @ApiOperation({ summary: 'Track content click' })
  async trackClick(
    @Body() body: {
      contentId: string;
      campaignId: string;
      placementId: string;
      userId: string;
      sessionId: string;
      deviceInfo: any;
    },
    @Req() req: Request
  ) {
    try {
      const tenantContext = this.getTenantContext(req);

      const success = await this.analyticsService.trackClick(
        body.contentId,
        body.campaignId,
        body.placementId,
        body.userId,
        body.sessionId,
        body.deviceInfo,
        tenantContext.tenantId,
      );

      return this.successResponse({ tracked: success });
    } catch (error: any) {
      return this.errorResponse(
        `Failed to track click: ${error.message}`,
        'CLICK_TRACKING_FAILED'
      );
    }
  }

  @Post('events')
  @ApiOperation({ summary: 'Track batch analytics events from SDK (fire-and-forget)' })
  async trackBatchEvents(
    @Body() body: { events: any[] },
    @Req() req: Request
  ) {
    if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
      return this.errorResponse('Events array is required', 'INVALID_PAYLOAD');
    }

    const tenantContext = this.getTenantContext(req);

    // Respond immediately — the SDK should never block waiting on analytics.
    this.analyticsService
      .trackEventBatch(body.events, tenantContext.tenantId)
      .catch((err: any) => {
        console.error(`[analytics] background batch failed: ${err.message}`);
      });

    return this.successResponse({ queued: body.events.length });
  }

  @Get()
  @ApiOperation({ summary: 'Get analytics data' })
  @ApiQuery({ name: 'campaignId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getAnalytics(
    @Req() req: Request,
    @Query('campaignId') campaignId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      const tenantContext = this.getTenantContext(req);

      const analytics = await this.analyticsService.getAnalytics(
        tenantContext.tenantId,
        campaignId,
        startDate,
        endDate,
      );

      return this.successResponse(analytics);
    } catch (error: any) {
      return this.errorResponse(
        `Failed to fetch analytics: ${error.message}`,
        'ANALYTICS_FETCH_FAILED'
      );
    }
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard analytics data' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to look back (default: 7)' })
  async getDashboardData(
    @Req() req: Request,
    @Query('days') days?: string
  ) {
    try {
      const tenantContext = this.getTenantContext(req);

      const dashboardData = await this.analyticsService.getDashboardData(
        tenantContext.tenantId,
        days ? parseInt(days) : 7,
      );

      return this.successResponse(dashboardData);
    } catch (error: any) {
      return this.errorResponse(
        `Failed to fetch dashboard data: ${error.message}`,
        'DASHBOARD_FETCH_FAILED'
      );
    }
  }
}
