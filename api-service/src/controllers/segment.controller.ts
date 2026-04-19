import { Controller, Post, Body, Req, Get, Param, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { BaseController } from './base.controller';
import { SegmentService } from '../services/segment.service';
import { CreateSegmentDto } from '../models/request/create-segment.request';


@ApiTags('Segments')
@Controller('segments')
export class SegmentController extends BaseController {
  constructor(private readonly segmentService: SegmentService) {
    super();
  }

  @Get('enrichment-attributes')
  @ApiOperation({ summary: 'List all enrichment attribute keys available for segment targeting (from CSV uploads)' })
  async getEnrichmentAttributes(@Req() req: Request) {
    try {
      const tenantContext = this.getTenantContext(req);
      const authToken = req.headers.authorization;
      const attributes = await this.segmentService.getEnrichmentAttributes(
        tenantContext.tenantId,
        authToken
      );
      return this.successResponse(attributes);
    } catch (error: any) {
      return this.errorResponse(
        `Failed to get enrichment attributes: ${error.message}`,
        'ENRICHMENT_ATTRIBUTES_FAILED'
      );
    }
  }

  @Post('estimate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Estimate audience size for a set of rules (no saved segment needed). Empty rules = total user count.' })
  async estimateAudience(@Body() body: { rules: any[]; logicalOperator?: 'AND' | 'OR' }, @Req() req: Request) {
    try {
      const tenantContext = this.getTenantContext(req);
      const authToken = (req as any).headers?.authorization;
      const { rules = [], logicalOperator = 'AND' } = body;

      // Allow empty rules — the downstream service interprets that as "all users"
      // (useful for fetching the total user count on mount).
      const estimate = await this.segmentService.estimateAudience(
        rules,
        logicalOperator,
        tenantContext.tenantId,
        authToken
      );

      return this.successResponse(estimate);
    } catch (error: any) {
      return this.errorResponse(
        `Failed to estimate audience: ${error.message}`,
        'ESTIMATE_FAILED'
      );
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user segment' })
  async createSegment(@Body() createSegmentDto: CreateSegmentDto, @Req() req: Request) {
    try {
      const tenantContext = this.getTenantContext(req);
      const authToken = req.headers.authorization;

      // user-segmentation-service derives createdBy/updatedBy from its own tenantContext
      const newSegment = await this.segmentService.createSegment(
        createSegmentDto,
        tenantContext.tenantId,
        authToken
      );

      return this.successResponse(newSegment);
    } catch (error: any) {
      return this.errorResponse(
        `Failed to create segment: ${error.message}`,
        'SEGMENT_CREATION_FAILED'
      );
    }
  }
    // --- ADD THIS METHOD ---
  @Get()
  @ApiOperation({ summary: 'Get all user segments for the tenant' })
  async getSegments(@Req() req: Request) {
    try {
      const tenantContext = this.getTenantContext(req);
      const authToken = req.headers.authorization;

      // Call the service method we just created
      const result = await this.segmentService.getSegments(
        tenantContext.tenantId,
        authToken
      );

      // The user-segmentation-service returns a response like { success: true, data: [...], metadata: {...} }
      // We can simply forward the data and metadata parts.
      return this.successResponse(result.data, result.metadata);

    } catch (error: any) {
      return this.errorResponse(
        `Failed to retrieve segments: ${error.message}`,
        'SEGMENT_FETCH_FAILED'
      );
    }
  }
    // --- ADD THIS METHOD ---
  @Get(':id')
  @ApiOperation({ summary: 'Get a single segment by its ID' })
  async getSegmentById(@Param('id') id: string, @Req() req: Request) {
    try {
      const tenantContext = this.getTenantContext(req);
      const authToken = req.headers.authorization;
      const segment = await this.segmentService.getSegmentById(id, tenantContext.tenantId, authToken);
      return this.successResponse(segment);
    } catch (error: any) {
      return this.errorResponse(
        `Failed to retrieve segment: ${error.message}`,
        'SEGMENT_FETCH_BY_ID_FAILED'
      );
    }
  }
}