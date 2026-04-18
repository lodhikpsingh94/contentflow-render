import { Controller, Post, Body, Req, Headers, UseInterceptors, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { GetContentRequest } from '../models/request/get-content.request';
import { ContentResponse } from '../models/response/content.response';
import { OrchestrationService } from '../services/orchestration.service';
import { ContentService } from '../services/content.service';
import { AnalyticsService } from '../services/analytics.service';
import { BaseController } from './base.controller';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';

@ApiTags('Content Delivery')
@Controller('content')
@UseInterceptors(LoggingInterceptor)
export class ContentController extends BaseController {
  constructor(
    private readonly orchestrationService: OrchestrationService,
    private readonly contentService: ContentService,
    private readonly analyticsService: AnalyticsService
  ) {
    super();
  }

  @Post('generate-upload-url')
  @ApiOperation({ summary: 'Generate a pre-signed URL for a file upload' })
  @ApiHeader({
    name: 'X-Tenant-Id',
    description: 'Tenant identifier',
    required: true
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token',
    required: true
  })
  async generateUploadUrl(
    @Body() body: { fileName: string, mimeType: string }, 
    @Req() req: Request
  ) {
    try {
      const tenantContext = this.getTenantContext(req);
      const authToken = req.headers.authorization;

      if (!body.fileName || !body.mimeType) {
        return this.errorResponse(
          'FileName and mimeType are required',
          'MISSING_REQUIRED_FIELDS'
        );
      }

      const result = await this.contentService.generateUploadUrl(
        tenantContext.tenantId, 
        body.fileName, 
        body.mimeType, 
        authToken
      );

      return this.successResponse(result);
    } catch (error: any) {
      return this.errorResponse(
        `Failed to generate upload URL: ${error.message}`,
        'URL_GENERATION_FAILED'
      );
    }
  }

  @Post('finalize-upload')
  @ApiOperation({ summary: 'Finalize an upload and save asset metadata' })
  @ApiHeader({
    name: 'X-Tenant-Id',
    description: 'Tenant identifier',
    required: true
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token',
    required: true
  })
  async finalizeUpload(@Body() body: any, @Req() req: Request) {
    try {
      const tenantContext = this.getTenantContext(req);
      const authToken = req.headers.authorization;

      if (!body.contentId || !body.storageKey) {
        return this.errorResponse(
          'contentId and storageKey are required',
          'MISSING_REQUIRED_FIELDS'
        );
      }

      const result = await this.contentService.finalizeUpload(
        body, 
        tenantContext.tenantId, 
        authToken
      );

      return this.successResponse(result);
    } catch (error: any) {
      return this.errorResponse(
        `Failed to finalize upload: ${error.message}`,
        'FINALIZE_UPLOAD_FAILED'
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'List content assets for a tenant' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiHeader({
    name: 'X-Tenant-Id',
    description: 'Tenant identifier',
    required: true
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token',
    required: true
  })
  async listContentAssets(@Req() req: Request) {
    try {
      const tenantContext = this.getTenantContext(req);
      const { page, limit } = this.getPaginationParams(req);
      const authToken = req.headers.authorization;

      const result = await this.contentService.listContent(
        tenantContext.tenantId, 
        page, 
        limit, 
        authToken
      );

      return this.successResponse(result);
    } catch (error: any) {
      return this.errorResponse(
        `Failed to list content assets: ${error.message}`,
        'CONTENT_LIST_FAILED'
      );
    }
  }

  @Post('deliver')
  @ApiOperation({ 
    summary: 'Get personalized content for user',
    description: 'Returns banners, videos, and popups based on user context and tenant configuration'
  })
  @ApiHeader({
    name: 'X-Tenant-Id',
    description: 'Tenant identifier',
    required: true,
    example: 'tenant1'
  })
  @ApiHeader({
    name: 'X-User-Id',
    description: 'User identifier',
    required: true,
    example: 'user_12345'
  })
  @ApiHeader({
    name: 'X-API-Key',
    description: 'API Key for authentication',
    required: false,
    example: 'tenant1_sk_1234567890abcdef'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Content delivered successfully',
    type: ContentResponse
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 401, description: 'Authentication failed' })
  @ApiResponse({ status: 403, description: 'Tenant access denied' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async getContent(
    @Body() request: GetContentRequest,
    @Req() req: Request,
    @Headers('X-User-Id') userId: string
  ): Promise<any> {
    try {
      if (!userId) return this.errorResponse('User ID header is required', 'MISSING_USER_ID');
      if (request.userId !== userId) return this.errorResponse('User ID mismatch', 'USER_ID_MISMATCH');

      const tenantContext = this.getTenantContext(req);
      
      if (tenantContext.tenant.status !== 'active') {
        return this.errorResponse('Tenant is not active', 'TENANT_INACTIVE');
      }

      // Call Orchestration Service
      const serviceResult = await this.orchestrationService.getContentForUser(request, tenantContext);
      
      if (!serviceResult.success) {
        return this.errorResponse(
          serviceResult.metadata?.error || 'Content delivery failed',
          'CONTENT_DELIVERY_FAILED',
          { tenantId: tenantContext.tenantId }
        );
      }

      // FIX: The service now returns a flat array in 'data', not nested 'content'
      const flatContent = serviceResult.data || [];

      // Add minimal tracking context to each item
      const contentWithTracking = flatContent.map((item: any) =>
        this.addTrackingContext(item, request)
      );

      // Fire-and-forget impression tracking — never block content delivery
      this.trackImpressions(flatContent, request, tenantContext).catch(() => {});

      return this.successResponse(contentWithTracking, {
        requestId: serviceResult.metadata.requestId,
        tenantId: tenantContext.tenantId,
        userId: request.userId,
        contentCount: contentWithTracking.length, // FIX: Simple length check
        processingTimeMs: serviceResult.metadata.processingTimeMs,
        cached: serviceResult.metadata.cached || false
      });

    } catch (error: any) {
      return this.errorResponse(
        error.message, 
        'CONTENT_DELIVERY_ERROR',
        { path: req.path }
      );
    }
  }

  @Get('preview')
  @ApiOperation({ summary: 'Preview content for a specific campaign' })
  @ApiHeader({
    name: 'X-Tenant-Id',
    description: 'Tenant identifier',
    required: true
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token',
    required: true
  })
  @ApiQuery({ name: 'campaignId', required: true, description: 'Campaign ID to preview' })
  @ApiQuery({ name: 'contentId', required: false, description: 'Specific content ID to preview' })
  async previewContent(
    @Req() req: Request,
    @Query('campaignId') campaignId: string,
    @Query('contentId') contentId?: string
  ): Promise<any> {
    try {
      const tenantContext = this.getTenantContext(req);
      
      // Check if tenant has preview feature
      if (!tenantContext.tenant.features.contentPreview) {
        return this.errorResponse(
          'Content preview feature not available for this tenant', 
          'FEATURE_NOT_AVAILABLE'
        );
      }

      let content;
      if (contentId) {
        // Preview specific content
        content = await this.contentService.getContentDetails(contentId, tenantContext.tenantId);
      } else {
        // Preview all content for campaign
        content = await this.contentService.getContentByCampaign(campaignId, tenantContext.tenantId);
      }

      return this.successResponse(content, {
        tenantId: tenantContext.tenantId,
        campaignId,
        preview: true
      });

    } catch (error: any) {
      return this.errorResponse(
        `Preview failed: ${error.message}`,
        'PREVIEW_FAILED',
        { campaignId, contentId }
      );
    }
  }

  @Get('validate')
  @ApiOperation({ summary: 'Validate content existence and accessibility' })
  @ApiHeader({
    name: 'X-Tenant-Id',
    description: 'Tenant identifier',
    required: true
  })
  @ApiQuery({ name: 'contentId', required: true, description: 'Content ID to validate' })
  async validateContent(
    @Req() req: Request,
    @Query('contentId') contentId: string
  ): Promise<any> {
    try {
      const tenantContext = this.getTenantContext(req);
      
      const isValid = await this.contentService.validateContent(contentId, tenantContext.tenantId);
      
      return this.successResponse({ valid: isValid }, {
        contentId,
        tenantId: tenantContext.tenantId
      });

    } catch (error: any) {
      return this.errorResponse(
        `Content validation failed: ${error.message}`,
        'VALIDATION_FAILED',
        { contentId }
      );
    }
  }

  /**
   * Add minimal tracking context — only IDs the SDK needs to build event payloads.
   * The SDK already holds deviceInfo, userId, sessionId locally; don't echo them back.
   */
  private addTrackingContext(content: any, request: GetContentRequest): any {
    return {
      ...content,
      trackingContext: {
        contentId: content.id,
        campaignId: content.campaignId,
        placementId: request.placementId,
      },
    };
  }

  /**
   * Generate a consistent session ID for the user
   */
  private generateSessionId(userId: string): string {
    // In a real implementation, you might want to use a proper session management system
    // For now, we'll create a session ID that's consistent for the same user in a short time window
    const timeWindow = Math.floor(Date.now() / (30 * 60 * 1000)); // 30-minute windows
    return `session_${userId}_${timeWindow}`;
  }

  /**
   * Track impressions for all delivered content items (fire-and-forget).
   * Uses Promise.all so all items are dispatched in parallel; caller discards the promise.
   */
  private async trackImpressions(
    contentItems: any[],
    request: GetContentRequest,
    tenantContext: any
  ): Promise<void> {
    const sessionId = this.generateSessionId(request.userId);
    await Promise.all(
      contentItems.map((item: any) =>
        this.analyticsService
          .trackImpression(
            item.id,
            item.campaignId,
            request.placementId,
            request.userId,
            sessionId,
            request.deviceInfo,
            tenantContext.tenantId
          )
          .catch(() => {}) // individual failure must not surface
      )
    );
  }

  /**
   * Health check for content delivery
   */
  @Get('health')
  @ApiOperation({ summary: 'Content delivery health check' })
  async contentHealthCheck(): Promise<any> {
    try {
      // Basic health check - in production, you might check dependencies
      return this.successResponse({
        status: 'healthy',
        service: 'content-delivery',
        timestamp: new Date(),
        features: {
          contentDelivery: true,
          tracking: true,
          upload: true,
          preview: true
        }
      });
    } catch (error: any) {
      return this.errorResponse(
        'Content delivery health check failed',
        'HEALTH_CHECK_FAILED'
      );
    }
  }
}