// src/lib/analytics/types.ts

export interface KpiCard {
  metric: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
}

export interface PerformanceTrendPoint {
  date: string;          // ISO date string
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface CampaignTypeDistribution {
  name: string;
  value: number;
  color: string;
}

export interface CampaignPerformanceRow {
  id: string;
  name: string;
  type: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;           // percentage
  spend: number;
  status: string;
}

export interface SegmentPerformanceRow {
  name: string;
  userCount: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface AnalyticsData {
  kpiCards: KpiCard[];
  performanceTrend: PerformanceTrendPoint[];
  campaignTypeDistribution: CampaignTypeDistribution[];
  campaignPerformance?: CampaignPerformanceRow[];
  segmentPerformance?: SegmentPerformanceRow[];
}

// ─── Dashboard Overview ───────────────────────────────────────────────────────

export interface OverviewKpi {
  name: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: string;
}

export interface TopCampaign {
  id: string;
  name: string;
  type: string;
  impressions: number;
  progress: number;      // 0-100, relative to max impressions
  ctr?: number;
}

export interface ActivityItem {
  eventType: string;
  campaignId: string;
  campaignName?: string;
  userId: string;
  timestamp?: string;
}

export interface DashboardOverviewData {
  kpis: OverviewKpi[];
  performanceTrend: PerformanceTrendPoint[];
  topCampaigns: TopCampaign[];
  recentActivity: ActivityItem[];
  activeCampaignsCount?: number;
  totalSegments?: number;
  totalUsers?: number;
}
