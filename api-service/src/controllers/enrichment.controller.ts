import { Controller, Post, Get, Body, Req, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { BaseController } from './base.controller';
import { EnrichmentService } from '../services/enrichment.service';

@ApiTags('Enrichment')
@Controller('enrichment')
export class EnrichmentController extends BaseController {
  constructor(private readonly enrichmentService: EnrichmentService) {
    super();
  }

  /**
   * POST /api/v1/enrichment/upload
   * Accepts parsed CSV records and bulk-loads them into the UserEnrichment collection.
   */
  @Post('upload')
  @ApiOperation({ summary: 'Bulk-upload user enrichment attributes from CSV' })
  async uploadData(@Body() body: any, @Req() req: Request) {
    try {
      const tenantContext = this.getTenantContext(req);
      const result = await this.enrichmentService.uploadData(body, tenantContext.tenantId);
      return this.successResponse(result);
    } catch (error: any) {
      return this.errorResponse(`Enrichment upload failed: ${error.message}`, 'ENRICHMENT_UPLOAD_FAILED');
    }
  }

  /**
   * GET /api/v1/enrichment/uploads
   * Returns upload job history for the authenticated tenant.
   */
  @Get('uploads')
  @ApiOperation({ summary: 'Get enrichment upload history for the tenant' })
  async getUploadHistory(@Req() req: Request) {
    try {
      const tenantContext = this.getTenantContext(req);
      const history = await this.enrichmentService.getUploadHistory(tenantContext.tenantId);
      return this.successResponse(history);
    } catch (error: any) {
      return this.errorResponse(`Failed to fetch upload history: ${error.message}`, 'ENRICHMENT_HISTORY_FAILED');
    }
  }

  /**
   * GET /api/v1/enrichment/user/:userId
   * Returns resolved enrichment attributes for a specific user.
   */
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get enrichment attributes for a specific user' })
  async getUserAttributes(@Param('userId') userId: string, @Req() req: Request) {
    try {
      const tenantContext = this.getTenantContext(req);
      const attrs = await this.enrichmentService.getUserAttributes(userId, tenantContext.tenantId);
      return this.successResponse(attrs);
    } catch (error: any) {
      return this.errorResponse(`Failed to fetch user attributes: ${error.message}`, 'ENRICHMENT_USER_FETCH_FAILED');
    }
  }
}
