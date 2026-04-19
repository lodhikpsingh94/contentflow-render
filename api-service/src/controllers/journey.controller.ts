import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { BaseController } from './base.controller';
import { JourneyClient } from '../clients/journey.client';

@ApiTags('Journeys')
@Controller('journeys')
export class JourneyController extends BaseController {
  constructor(private readonly journeyClient: JourneyClient) {
    super();
  }

  @Get()
  @ApiOperation({ summary: 'List all journeys for tenant' })
  async getJourneys(@Req() req: Request) {
    try {
      const { tenantId } = this.getTenantContext(req);
      const authToken = req.headers.authorization;
      const result = await this.journeyClient.getJourneys(tenantId, authToken);
      if (!result.success) return this.errorResponse(result.error || 'Failed to fetch journeys', 'JOURNEYS_FETCH_FAILED');
      return this.successResponse((result.data as any)?.data ?? result.data);
    } catch (err: any) {
      return this.errorResponse(`Failed to fetch journeys: ${err.message}`, 'JOURNEYS_FETCH_FAILED');
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get journey by ID' })
  async getJourney(@Param('id') id: string, @Req() req: Request) {
    try {
      const { tenantId } = this.getTenantContext(req);
      const authToken = req.headers.authorization;
      const result = await this.journeyClient.getJourneyById(id, tenantId, authToken);
      if (!result.success) return this.errorResponse(result.error || 'Journey not found', 'JOURNEY_NOT_FOUND');
      return this.successResponse((result.data as any)?.data ?? result.data);
    } catch (err: any) {
      return this.errorResponse(`Failed to get journey: ${err.message}`, 'JOURNEY_FETCH_FAILED');
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a new journey' })
  async createJourney(@Body() body: any, @Req() req: Request) {
    try {
      const { tenantId } = this.getTenantContext(req);
      const authToken = req.headers.authorization;
      const result = await this.journeyClient.createJourney(body, tenantId, authToken);
      if (!result.success) return this.errorResponse(result.error || 'Failed to create journey', 'JOURNEY_CREATE_FAILED');
      return this.successResponse((result.data as any)?.data ?? result.data);
    } catch (err: any) {
      return this.errorResponse(`Failed to create journey: ${err.message}`, 'JOURNEY_CREATE_FAILED');
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a journey' })
  async updateJourney(@Param('id') id: string, @Body() body: any, @Req() req: Request) {
    try {
      const { tenantId } = this.getTenantContext(req);
      const authToken = req.headers.authorization;
      const result = await this.journeyClient.updateJourney(id, body, tenantId, authToken);
      if (!result.success) return this.errorResponse(result.error || 'Failed to update journey', 'JOURNEY_UPDATE_FAILED');
      return this.successResponse((result.data as any)?.data ?? result.data);
    } catch (err: any) {
      return this.errorResponse(`Failed to update journey: ${err.message}`, 'JOURNEY_UPDATE_FAILED');
    }
  }

  @Patch(':id/status')
  @ApiOperation({ summary: "Update a journey's status" })
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }, @Req() req: Request) {
    try {
      const { tenantId } = this.getTenantContext(req);
      const authToken = req.headers.authorization;
      const result = await this.journeyClient.updateJourneyStatus(id, body.status, tenantId, authToken);
      if (!result.success) return this.errorResponse(result.error || 'Failed to update status', 'JOURNEY_STATUS_FAILED');
      return this.successResponse((result.data as any)?.data ?? result.data);
    } catch (err: any) {
      return this.errorResponse(`Failed to update journey status: ${err.message}`, 'JOURNEY_STATUS_FAILED');
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a journey' })
  async deleteJourney(@Param('id') id: string, @Req() req: Request) {
    try {
      const { tenantId } = this.getTenantContext(req);
      const authToken = req.headers.authorization;
      const result = await this.journeyClient.deleteJourney(id, tenantId, authToken);
      if (!result.success) return this.errorResponse(result.error || 'Failed to delete journey', 'JOURNEY_DELETE_FAILED');
      return this.successResponse({ deleted: true });
    } catch (err: any) {
      return this.errorResponse(`Failed to delete journey: ${err.message}`, 'JOURNEY_DELETE_FAILED');
    }
  }
}
