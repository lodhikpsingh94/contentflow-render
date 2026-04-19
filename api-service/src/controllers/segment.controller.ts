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
      const attributes = await this.segmentService.getEnrichmentAttributes(tenantContext.tenantId);
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
      const { rules = [], logicalOperator = 'AND' } = body;

      const estimate = await this.segmentService.estimateAudience(
        rules,
        logicalOperator,
        tenantContext.tenantId,
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
      const newSegment = await this.segmentService.createSegment(createSegmentDto, tenantContext.tenantId);
      return this.successResponse(newSegment);
    } catch (error: any) {
      return this.errorResponse(
        `Failed to create segment: ${error.message}`,
        'SEGMENT_CREATION_FAILED'
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all user segments for the tenant' })
  async getSegments(@Req() req: Request) {
    try {
      const tenantContext = this.getTenantContext(req);
      const result = await this.segmentService.getSegments(tenantContext.tenantId);
      return this.successResponse(result.data, result.metadata);
    } catch (error: any) {
      return this.errorResponse(
        `Failed to retrieve segments: ${error.message}`,
        'SEGMENT_FETCH_FAILED'
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single segment by its ID' })
  async getSegmentById(@Param('id') id: string, @Req() req: Request) {
    try {
      const tenantContext = this.getTenantContext(req);
      const segment = await this.segmentService.getSegmentById(id, tenantContext.tenantId);
      return this.successResponse(segment);
    } catch (error: any) {
      return this.errorResponse(
        `Failed to retrieve segment: ${error.message}`,
        'SEGMENT_FETCH_BY_ID_FAILED'
      );
    }
  }
}
