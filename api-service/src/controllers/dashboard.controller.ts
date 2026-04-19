import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { BaseController } from './base.controller';
import { AnalyticsService } from '../services/analytics.service';
import { CampaignClient } from '../clients/campaign.client';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController extends BaseController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly campaignClient: CampaignClient,
  ) {
    super();
  }

  /**
   * GET /api/v1/dashboard/overview
   * Returns a summary suitable for the main dashboard overview page:
   * KPI cards, performance trend, top campaigns, recent activity.
   */
  @Get('overview')
  @ApiOperation({ summary: 'Get dashboard overview data' })
  async getOverview(@Req() req: Request) {
    try {
      const tenantContext = this.getTenantContext(req);
      const { tenantId } = tenantContext;

      // Fetch analytics dashboard + campaign list in parallel
      const [analyticsData, campaignsData] = await Promise.allSettled([
        this.analyticsService.getDashboardData(tenantId).catch(() => null),
        this.campaignClient.getCampaignsByTenant(tenantId, 1, 50).catch(() => null),
      ]);

      const analytics = analyticsData.status === 'fulfilled' ? analyticsData.value : null;
      const campaigns: any[] = (() => {
        if (campaignsData.status !== 'fulfilled' || !campaignsData.value) return [];
        const d = campaignsData.value as any;
        // The campaign-service returns { success, data: { data: [...], pagination: {...} } }
        if (Array.isArray(d?.data?.data)) return d.data.data;
        if (Array.isArray(d?.data)) return d.data;
        if (Array.isArray(d?.campaigns)) return d.campaigns;
        return [];
      })();

      // ── KPIs ──────────────────────────────────────────────────────────────
      const kpis = analytics?.kpiCards?.map((kpi: any) => ({
        name:       kpi.metric,
        value:      kpi.value,
        change:     kpi.change,
        changeType: kpi.changeType,
        icon:       this.metricToIcon(kpi.metric),
      })) ?? [
        { name: 'Active Campaigns', value: campaigns.filter((c: any) => c.status === 'active' || c.status === 'approved').length.toString(), change: '', changeType: 'increase', icon: 'Zap' },
        { name: 'Total Impressions', value: '0', change: 'No data', changeType: 'increase', icon: 'Eye' },
        { name: 'Click Rate',        value: '0%', change: 'No data', changeType: 'increase', icon: 'MousePointer' },
        { name: 'Conversions',       value: '0', change: 'No data', changeType: 'increase', icon: 'Target' },
      ];

      // ── Performance trend ────────────────────────────────────────────────
      const performanceTrend = analytics?.performanceTrend ?? this.generateEmptyTrend(7);

      // ── Top campaigns ──────────────────────────────────────────────────
      const sortedCampaigns = [...campaigns]
        .sort((a: any, b: any) => (b.statistics?.impressions ?? 0) - (a.statistics?.impressions ?? 0))
        .slice(0, 5);

      const maxImpressions = sortedCampaigns[0]?.statistics?.impressions ?? 1;

      const topCampaigns = sortedCampaigns.map((c: any) => ({
        id:          c._id,
        name:        c.name,
        type:        c.type,
        impressions: c.statistics?.impressions ?? 0,
        progress:    maxImpressions > 0
          ? Math.round(((c.statistics?.impressions ?? 0) / maxImpressions) * 100)
          : 0,
        ctr: c.statistics?.impressions > 0
          ? parseFloat(((c.statistics?.clicks ?? 0) / c.statistics.impressions * 100).toFixed(1))
          : 0,
      }));

      // ── Recent activity from analytics ───────────────────────────────────
      const recentActivity = analytics?.recentActivity ?? [];

      // ── Summary counts ─────────────────────────────────────────────────
      const activeCampaignsCount = campaigns.filter(
        (c: any) => c.status === 'active' || c.status === 'approved' || c.status === 'scheduled'
      ).length;

      return this.successResponse({
        kpis,
        performanceTrend,
        topCampaigns,
        recentActivity,
        activeCampaignsCount,
        totalSegments: analytics?.totalSegments,
        totalUsers:    analytics?.totalUsers,
      });
    } catch (error: any) {
      return this.errorResponse(
        `Failed to fetch dashboard overview: ${error.message}`,
        'DASHBOARD_OVERVIEW_FAILED'
      );
    }
  }

  private metricToIcon(metric: string): string {
    const map: Record<string, string> = {
      'Total Impressions': 'Eye',
      'Total Clicks':      'MousePointer',
      'Conversions':       'Target',
      'Click Rate':        'MousePointer',
      'Conversion Rate':   'Users',
      'Active Campaigns':  'Zap',
    };
    return map[metric] ?? 'Zap';
  }

  private generateEmptyTrend(days: number) {
    const trend = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      trend.push({
        date:        d.toISOString().split('T')[0],
        impressions: 0,
        clicks:      0,
        conversions: 0,
      });
    }
    return trend;
  }
}
