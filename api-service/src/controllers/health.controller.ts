import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { CampaignClient } from '../clients/campaign.client';
import { ContentClient } from '../clients/content.client';
import { SegmentClient } from '../clients/segment.client';
import { AnalyticsClient } from '../clients/analytics.client'; // <-- ADD THIS
import { Cache } from '../utils/cache';
import { BaseController } from './base.controller';


@ApiTags('Health')
@Controller('health')
export class HealthController extends BaseController {
  constructor(
    private readonly campaignClient: CampaignClient,
    private readonly contentClient: ContentClient,
    private readonly segmentClient: SegmentClient,
    private readonly analyticsClient: AnalyticsClient, // <-- ADD THIS
    private readonly cache: Cache,
  ) {
    super();
  }

  @Get()
  @ApiOperation({ summary: 'Basic health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck(): Promise<any> {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      service: 'api-service',
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    return this.successResponse(health);
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with dependencies' })
  @ApiHeader({
    name: 'X-Tenant-Id',
    description: 'Tenant identifier',
    required: false
  })
  async detailedHealthCheck(@Req() req: Request): Promise<any> {
    const health: any = {
      status: 'healthy',
      timestamp: new Date(),
      service: 'api-service',
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      dependencies: {}
    };

    try {
      // Check cache health
      const cacheHealth = await this.cache.healthCheck();
      health.dependencies.redis = cacheHealth ? 'healthy' : 'unhealthy';
      if (!cacheHealth) health.status = 'degraded';
    } catch (error) {
      health.dependencies.redis = 'unhealthy';
      health.status = 'degraded';
    }

    try {
      // Check campaign service health
      const campaignHealth = await this.campaignClient.healthCheck();
      health.dependencies.campaignService = campaignHealth ? 'healthy' : 'unhealthy';
      if (!campaignHealth) health.status = 'degraded';
    } catch (error) {
      health.dependencies.campaignService = 'unhealthy';
      health.status = 'degraded';
    }

    try {
      // Check content service health
      const contentHealth = await this.contentClient.healthCheck();
      health.dependencies.contentService = contentHealth ? 'healthy' : 'unhealthy';
      if (!contentHealth) health.status = 'degraded';
    } catch (error) {
      health.dependencies.contentService = 'unhealthy';
      health.status = 'degraded';
    }

    try {
      // Check segment service health
      const segmentHealth = await this.segmentClient.healthCheck();
      health.dependencies.segmentService = segmentHealth ? 'healthy' : 'unhealthy';
      if (!segmentHealth) health.status = 'degraded';
    } catch (error) {
      health.dependencies.segmentService = 'unhealthy';
      health.status = 'degraded';
    }

    // Add tenant context if available
    try {
      const tenantContext = req['tenantContext'];
      if (tenantContext) {
        health.tenantContext = {
          tenantId: tenantContext.tenantId,
          tenantName: tenantContext.tenant.name,
          status: tenantContext.tenant.status
        };
      }
    } catch {
      // Ignore tenant context errors in health check
    }

    // Add environment info
    health.environment = {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      redisHost: process.env.REDIS_HOST
    };

    return this.successResponse(health);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check for Kubernetes' })
  async readinessCheck(): Promise<any> {
    const checks = {
      api: true,
      cache: await this.cache.healthCheck(),
      campaignService: await this.campaignClient.healthCheck(),
      contentService: await this.contentClient.healthCheck(),
      segmentService: await this.segmentClient.healthCheck(),
      analyticsService: await this.analyticsClient.healthCheck(), // <-- ADD THIS
    };

    const isReady = Object.values(checks).every(Boolean);
    const status = isReady ? 'ready' : 'not ready';

    return this.successResponse({
      status,
      timestamp: new Date(),
      checks
    });
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check for Kubernetes' })
  async livenessCheck(): Promise<any> {
    return this.successResponse({
      status: 'live',
      timestamp: new Date(),
      uptime: process.uptime()
    });
  }
}