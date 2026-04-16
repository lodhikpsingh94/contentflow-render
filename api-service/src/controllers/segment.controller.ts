import { Controller, Post, Body, Req, Get, Param } from '@nestjs/common';
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

  @Post()
  @ApiOperation({ summary: 'Create a new user segment' })
  async createSegment(@Body() createSegmentDto: CreateSegmentDto, @Req() req: Request) {
    try {
      const tenantContext = this.getTenantContext(req);
      const authToken = req.headers.authorization;
      
      // The userId from the JWT should be passed as `createdBy`
      const segmentPayload = {
        ...createSegmentDto,
        createdBy: tenantContext.userId,
        updatedBy: tenantContext.userId,
      };

      const newSegment = await this.segmentService.createSegment(
        segmentPayload,
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