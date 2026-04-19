import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsClient } from '../clients/analytics.client';
import { CampaignClient } from '../clients/campaign.client';
import { SegmentClient } from '../clients/segment.client';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly analyticsClient: AnalyticsClient,
    private readonly campaignClient: CampaignClient,
    private readonly segmentClient: SegmentClient,
  ) {}

  async trackImpression(
    contentId: string,
    campaignId: string,
    placementId: string,
    userId: string,
    sessionId: string,
    deviceInfo: any,
    tenantId: string,
  ): Promise<boolean> {
    try {
      const event = {
        eventType: 'BANNER_IMPRESSION',
        contentId,
        campaignId,
        placementId,
        userId,
        sessionId,
        deviceInfo,
        timestamp: new Date(),
      };

      const response = await this.analyticsClient.trackEvents([event], tenantId);

      if (!response.success) {
        this.logger.warn(`Failed to track impression: ${response.error}`);
        return false;
      }

      this.logger.debug(`Tracked impression for content: ${contentId}, user: ${userId}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Error tracking impression: ${error.message}`);
      return false;
    }
  }

  async trackClick(
    contentId: string,
    campaignId: string,
    placementId: string,
    userId: string,
    sessionId: string,
    deviceInfo: any,
    tenantId: string,
  ): Promise<boolean> {
    try {
      const event = {
        eventType: 'BANNER_CLICK',
        contentId,
        campaignId,
        placementId,
        userId,
        sessionId,
        deviceInfo,
        timestamp: new Date(),
      };

      const response = await this.analyticsClient.trackEvents([event], tenantId);

      if (!response.success) {
        this.logger.warn(`Failed to track click: ${response.error}`);
        return false;
      }

      this.logger.debug(`Tracked click for content: ${contentId}, user: ${userId}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Error tracking click: ${error.message}`);
      return false;
    }
  }

  async getAnalytics(
    tenantId: string,
    campaignId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any> {
    try {
      const response = await this.analyticsClient.getAnalytics(tenantId, campaignId, startDate, endDate);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch analytics');
      }

      return response.data;
    } catch (error: any) {
      this.logger.error(`Error fetching analytics: ${error.message}`);
      throw error;
    }
  }

  async trackEventBatch(events: any[], tenantId: string): Promise<any> {
    try {
      const response = await this.analyticsClient.trackEvents(events, tenantId);

      if (!response.success) {
        this.logger.warn(`Failed to track batch events: ${response.error}`);
        throw new Error(response.error);
      }

      return response.data;
    } catch (error: any) {
      this.logger.error(`Error tracking batch events: ${error.message}`);
      throw error;
    }
  }

  async getDashboardData(tenantId: string, days: number = 7): Promise<any> {
    try {
      // Fetch analytics + campaigns in parallel — campaign failure is non-fatal
      const [analyticsResult, campaignsResult] = await Promise.allSettled([
        this.analyticsClient.getDashboardData(tenantId, days),
        this.campaignClient.getCampaignsByTenant(tenantId, 1, 100),
      ]);

      if (analyticsResult.status === 'rejected' || !analyticsResult.value.success) {
        const msg = analyticsResult.status === 'rejected'
          ? analyticsResult.reason?.message
          : analyticsResult.value.error;
        throw new Error(msg || 'Failed to fetch dashboard data');
      }

      const analytics: any = analyticsResult.value.data;

      // Normalise campaigns array from various response shapes
      const campaigns: any[] = (() => {
        if (campaignsResult.status !== 'fulfilled' || !campaignsResult.value.success) return [];
        const d = campaignsResult.value.data as any;
        if (Array.isArray(d?.data?.data)) return d.data.data;
        if (Array.isArray(d?.campaigns))  return d.campaigns;
        if (Array.isArray(d?.data))       return d.data;
        return [];
      })();

      // ── campaignPerformance: join analytics metrics with campaign metadata ──
      const campaignMetrics: any[] = analytics.campaignMetrics || [];
      const campaignById = new Map(campaigns.map((c: any) => [c._id || c.id, c]));

      const campaignPerformance = campaignMetrics
        .filter((m: any) => m.campaignId)
        .map((m: any) => {
          const camp = campaignById.get(m.campaignId) || {};
          return {
            id:          m.campaignId,
            name:        camp.name        || m.campaignId,
            type:        camp.type        || 'banner',
            impressions: m.impressions    || 0,
            clicks:      m.clicks         || 0,
            conversions: m.conversions    || 0,
            ctr:         m.ctr            || 0,
            spend:       camp.budget?.totalBudget || 0,
            status:      camp.status      || 'active',
          };
        });

      // ── segmentPerformance: attribute campaign metrics to targeted segments ──
      const segmentAccum: Record<string, { impressions: number; clicks: number }> = {};
      for (const camp of campaigns) {
        const cid = camp._id || camp.id;
        const metric = campaignMetrics.find((m: any) => m.campaignId === cid);
        if (!metric) continue;
        const targetedSegments: string[] = camp.rules?.segments || [];
        for (const segId of targetedSegments) {
          if (!segmentAccum[segId]) segmentAccum[segId] = { impressions: 0, clicks: 0 };
          segmentAccum[segId].impressions += metric.impressions || 0;
          segmentAccum[segId].clicks      += metric.clicks      || 0;
        }
      }

      // Resolve segment names (best-effort, non-fatal)
      const segmentIds = Object.keys(segmentAccum);
      const segmentNames: Record<string, string> = {};
      if (segmentIds.length > 0) {
        try {
          const segRes = await this.segmentClient.getSegments(tenantId);
          if (segRes.success && segRes.data) {
            const list = Array.isArray(segRes.data)
              ? segRes.data
              : (segRes.data as any).data || [];
            for (const s of list) {
              segmentNames[s._id || s.id] = s.name;
            }
          }
        } catch { /* names are optional */ }
      }

      const segmentPerformance = Object.entries(segmentAccum)
        .map(([id, m]) => ({
          name:        segmentNames[id] || id,
          impressions: m.impressions,
          clicks:      m.clicks,
          userCount:   0,
          ctr:         m.impressions > 0
            ? parseFloat(((m.clicks / m.impressions) * 100).toFixed(2))
            : 0,
        }))
        .sort((a, b) => b.ctr - a.ctr)
        .slice(0, 10);

      return {
        ...analytics,
        campaignPerformance,
        segmentPerformance,
      };
    } catch (error: any) {
      this.logger.error(`Error fetching dashboard data: ${error.message}`);
      throw error;
    }
  }
}
