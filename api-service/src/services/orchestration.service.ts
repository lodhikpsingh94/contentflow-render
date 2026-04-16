import { Injectable, Logger } from '@nestjs/common';
import { Campaign, CampaignClient } from '../clients/campaign.client';
import { ContentClient, ContentItem } from '../clients/content.client';
import { SegmentClient } from '../clients/segment.client';
import { GetContentRequest } from '../models/request/get-content.request';
import { TenantContext } from '../models/shared/tenant.types';

@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);

  constructor(
    private readonly campaignClient: CampaignClient,
    private readonly contentClient: ContentClient,
    private readonly segmentClient: SegmentClient
  ) {}

  async getContentForUser(
    request: GetContentRequest,
    tenantContext: TenantContext,
    authToken?: string
  ): Promise<{ success: boolean; data: any[]; metadata: any }> {
    const { tenantId } = tenantContext;
    const { userId, placementId, deviceInfo, location, context } = request;
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // 1. Get Segments
      const segmentsResponse = await this.segmentClient.evaluateUserSegments(
          { userId, deviceInfo, location, context }, 
          tenantId, 
          authToken
      );
      
      let userSegments: string[] = [];
      if (segmentsResponse.success && segmentsResponse.data) {
          const raw = segmentsResponse.data as any;
          userSegments = Array.isArray(raw) ? raw : (raw.data || []);
      }

      // 2. Get Campaigns
      const campaignsResponse = await this.campaignClient.getActiveCampaigns({
          userId, placementId, segments: userSegments, device: deviceInfo, location, context
      }, tenantId);

      let eligibleCampaigns: Campaign[] = [];
      if (campaignsResponse.success && campaignsResponse.data) {
          const raw = campaignsResponse.data as any;
          eligibleCampaigns = Array.isArray(raw) ? raw : (raw.data || []);
      }

      if (eligibleCampaigns.length === 0) {
        return this.buildResponse([], requestId, startTime, tenantId);
      }

      // 3. Fetch Content (If applicable)
      const contentIds = eligibleCampaigns.flatMap(c => c.contentIds || []);
      let contentItems: ContentItem[] = [];
      
      if (contentIds.length > 0) {
          const uniqueIds = [...new Set(contentIds)];
          const contentRes = await this.contentClient.getContentByIds(uniqueIds, tenantId);
          if (contentRes.success && contentRes.data) {
              const raw = contentRes.data as any;
              contentItems = Array.isArray(raw) ? raw : (raw.data || []);
          }
      }

      // 4. TRANSFORMATION & MAPPING (The Fix)
      // We convert the heavy Campaign objects into lightweight UI objects
      const clientResponse = eligibleCampaigns.map(campaign => {
          // A. Try to find linked content
          const linkedContent = contentItems.find(c => campaign.contentIds?.includes(c.id));

          // B. If linked content exists, use it. 
          // C. If NOT, fallback to Campaign Metadata (Self-contained banner)
          const title = linkedContent?.title || campaign.metadata?.contentText;
          const description = linkedContent?.content || campaign.metadata?.content || campaign.description;
          const imageUrl = linkedContent?.assets?.images?.[0]?.url || campaign.metadata?.imageUrl;
          const ctaText = linkedContent?.metadata?.callToAction || campaign.metadata?.ctaText;
          const actionUrl = linkedContent?.metadata?.callToAction || campaign.metadata?.actionUrl;
          const styleColor = linkedContent?.assets?.styles?.backgroundColor || campaign.metadata?.bannerColor;

          return {
              id: linkedContent?.id || campaign.id || campaign._id,
              campaignId: campaign.id || campaign._id,
              type: campaign.type,
              title: title,
              description: description,
              imageUrl: imageUrl,
              ctaText: ctaText,
              actionUrl: actionUrl,
              // Pass minimal metadata for frontend styling/tracking
              metadata: {
                  placementId: placementId,
                  priority: campaign.priority,
                  styleColor: styleColor
              }
          };
      });

      return this.buildResponse(clientResponse, requestId, startTime, tenantId);

    } catch (error: any) {
        this.logger.error(`[Orchestration] Error: ${error.message}`);
        // Return empty successful response on error to prevent app crash
        return this.buildResponse([], requestId, startTime, tenantId);
    }
  }

  private buildResponse(data: any[], requestId: string, startTime: number, tenantId: string) {
      return {
          success: true,
          data: data,
          metadata: {
              requestId,
              timestamp: new Date(),
              processingTimeMs: Date.now() - startTime,
              tenantId,
              itemCount: data.length
          }
      };
  }
}