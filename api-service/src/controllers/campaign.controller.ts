import { Controller, Get, Post, Param, Query, Req, Body, Put, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { CampaignService } from '../services/campaign.service';
import { BaseController } from './base.controller';
import { CreateCampaignDto } from '../models/request/create-campaign.request';
import { SegmentService } from '../services/segment.service';

function translateSegmentRulesToTargeting(segmentRules: any[], segmentId: string): any {
    const targeting = {
        geo: { countries: [] as string[] },
        devices: { platforms: [] as string[] },
        userAttributes: { segments: [segmentId], customAttributes: {} as Record<string, any> },
        behavior: {},
    };

    if (Array.isArray(segmentRules)) {
        for (const rule of segmentRules) {
            if (!rule || !rule.field) continue;
            if (rule.field.includes('country')) {
                const values = Array.isArray(rule.value) ? rule.value : [rule.value];
                targeting.geo.countries.push(...values);
            }
            if (rule.field.includes('platform')) {
                const values = Array.isArray(rule.value) ? rule.value : [rule.value];
                targeting.devices.platforms.push(...values);
            }
        }
    }
    
    if (targeting.geo.countries.length === 0) {
        targeting.geo.countries.push("US");
    }
    if (targeting.devices.platforms.length === 0) {
        targeting.devices.platforms.push("ios", "android", "web");
    }
    
    return targeting;
}


@ApiTags('Campaigns')
@Controller('campaigns')
export class CampaignController extends BaseController {
  constructor(
    private readonly campaignService: CampaignService,
    private readonly segmentService: SegmentService
  ) {
    super();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new campaign' })
  async createCampaign(@Body() createCampaignDto: CreateCampaignDto, @Req() req: Request) {
    try {
        const tenantContext = this.getTenantContext(req);
        const authToken = req.headers.authorization;

        const segmentId = createCampaignDto.segments[0];
        if (!segmentId) {
            throw new Error("A target segment ID is required.");
        }
        
        const segmentDetails = await this.segmentService.getSegmentById(segmentId, tenantContext.tenantId, authToken);
        if (!segmentDetails) {
            throw new Error(`Target segment with ID ${segmentId} not found.`);
        }
        
        const campaignTargeting = translateSegmentRulesToTargeting(segmentDetails.rules, segmentId);

        // Build a clean schedule — strip null/undefined so Mongoose enum
        // validators don't reject fields like seasonalTag: null
        const rawSchedule: Record<string, any> = { ...(createCampaignDto.schedule as any) };
        const cleanSchedule: Record<string, any> = {};
        for (const [k, v] of Object.entries(rawSchedule)) {
            if (v !== null && v !== undefined) cleanSchedule[k] = v;
        }

        const campaignPayload: Record<string, any> = {
            name: createCampaignDto.name,
            type: createCampaignDto.type,
            status: 'draft',
            rules: {
                segments: createCampaignDto.segments,
                schedule: cleanSchedule,
                frequencyCapping: { maxImpressions: 10, period: 'day', perUser: true },
                targeting: campaignTargeting,
            },
            contentIds: ['content_placeholder_123'],
            priority: createCampaignDto.priority,
            metadata: {
                ...createCampaignDto.metadata,
                contentText: createCampaignDto.metadata?.content,
            },
        };
        // Only include subType when it has a value
        if (createCampaignDto.subType) campaignPayload.subType = createCampaignDto.subType;
        // Include bilingual content and placement IDs when present
        if (createCampaignDto.content) campaignPayload.content = createCampaignDto.content;
        if (createCampaignDto.placementIds?.length) campaignPayload.placementIds = createCampaignDto.placementIds;
        // Include budget only when meaningful values exist
        if (createCampaignDto.budget?.total || createCampaignDto.budget?.dailyCap) {
            campaignPayload.budget = {
                total: createCampaignDto.budget.total ?? 0,
                dailyLimit: createCampaignDto.budget.dailyCap ?? 0,
                currency: createCampaignDto.budget.currency ?? 'SAR',
            };
        }

        const newCampaign = await this.campaignService.createCampaign(campaignPayload, tenantContext.tenantId, authToken);
        
        return this.successResponse(newCampaign);

    } catch (error: any) {
        const errorMessage = error.response?.data?.error || error.message;
        return this.errorResponse(`Failed to create campaign: ${errorMessage}`, 'CAMPAIGN_CREATION_FAILED');
    }
  }
  
  @Get()
  @ApiOperation({ summary: 'Get campaigns for tenant' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'paused', 'ended', 'draft', 'scheduled', 'completed'] })
  async getCampaigns(@Req() req: Request): Promise<any> {
    try {
      const tenantContext = this.getTenantContext(req);
      const { page, limit } = this.getPaginationParams(req);
      const authToken = req.headers.authorization;
      const status = req.query.status as string | undefined;

      if (!tenantContext.tenant) {
        return this.errorResponse('Tenant context is invalid', 'INVALID_TENANT_CONTEXT');
      }

      const campaignsResponse = await this.campaignService.getCampaigns(
        tenantContext.tenantId, 
        page, 
        limit,
        status,
        authToken,
      );
      
      return this.successResponse(campaignsResponse);

    } catch (error: any) {
      return this.errorResponse(
        `Failed to fetch campaigns: ${error.message}`,
        'CAMPAIGNS_FETCH_FAILED'
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async getCampaign(@Req() req: Request, @Param('id') campaignId: string): Promise<any> {
    try {
      const tenantContext = this.getTenantContext(req);
      const authToken = req.headers.authorization;
      
      const campaign = await this.campaignService.getCampaignDetails(campaignId, tenantContext.tenantId, authToken);
      
      return this.successResponse(campaign);

    } catch (error: any) {
      return this.errorResponse(
        `Failed to get campaign details: ${error.message}`,
        'CAMPAIGN_FETCH_FAILED'
      );
    }
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update a campaign\'s status' })
  async updateStatus(@Param('id') campaignId: string, @Body() body: { status: string }, @Req() req: Request) {
    try {
      const tenantContext = this.getTenantContext(req);
      const authToken = req.headers.authorization;
      
      const updatedCampaign = await this.campaignService.updateCampaignStatus(
        campaignId,
        body.status,
        tenantContext.tenantId,
        authToken
      );
      return this.successResponse(updatedCampaign);
    } catch (error: any) {
      return this.errorResponse(`Failed to update status: ${error.message}`, 'STATUS_UPDATE_FAILED');
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a campaign\'s details' })
  async updateCampaign(
    @Param('id') campaignId: string,
    @Body() updateCampaignDto: CreateCampaignDto,
    @Req() req: Request
  ) {
    try {
      const tenantContext = this.getTenantContext(req);
      const authToken = req.headers.authorization;
      
      const segmentId = updateCampaignDto.segments[0];
      if (!segmentId) throw new Error("A target segment ID is required.");
      
      const segmentDetails = await this.segmentService.getSegmentById(segmentId, tenantContext.tenantId, authToken);
      if (!segmentDetails) throw new Error(`Target segment with ID ${segmentId} not found.`);
      
      const campaignTargeting = translateSegmentRulesToTargeting(segmentDetails.rules, segmentId);

      const rawScheduleU: Record<string, any> = { ...(updateCampaignDto.schedule as any) };
      const cleanScheduleU: Record<string, any> = {};
      for (const [k, v] of Object.entries(rawScheduleU)) {
          if (v !== null && v !== undefined) cleanScheduleU[k] = v;
      }

      const campaignPayload: Record<string, any> = {
          name: updateCampaignDto.name,
          type: updateCampaignDto.type,
          rules: {
              segments: updateCampaignDto.segments,
              schedule: cleanScheduleU,
              frequencyCapping: { maxImpressions: 10, period: 'day', perUser: true },
              targeting: campaignTargeting,
          },
          contentIds: ['content_placeholder_123'],
          priority: updateCampaignDto.priority,
          metadata: {
              ...updateCampaignDto.metadata,
              contentText: updateCampaignDto.metadata?.content,
          },
      };
      if (updateCampaignDto.subType) campaignPayload.subType = updateCampaignDto.subType;
      if (updateCampaignDto.content) campaignPayload.content = updateCampaignDto.content;
      if (updateCampaignDto.placementIds?.length) campaignPayload.placementIds = updateCampaignDto.placementIds;

      const updatedCampaign = await this.campaignService.updateCampaign(
        campaignId,
        campaignPayload,
        tenantContext.tenantId,
        authToken
      );

      return this.successResponse(updatedCampaign);
    } catch (error: any) {
      return this.errorResponse(`Failed to update campaign: ${error.message}`, 'CAMPAIGN_UPDATE_FAILED');
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a campaign' })
  async deleteCampaign(@Param('id') campaignId: string, @Req() req: Request) {
    try {
      const tenantContext = this.getTenantContext(req);
      const authToken = req.headers.authorization;
      
      await this.campaignService.deleteCampaign(campaignId, tenantContext.tenantId, authToken);
      
      return this.successResponse({ deleted: true });
    } catch (error: any) {
      return this.errorResponse(`Failed to delete campaign: ${error.message}`, 'CAMPAIGN_DELETE_FAILED');
    }
  }
}