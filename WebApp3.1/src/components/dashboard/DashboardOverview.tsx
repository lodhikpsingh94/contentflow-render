import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Skeleton } from '../ui/skeleton';
import {
  TrendingUp, TrendingDown, Users, Eye, MousePointer, Target, ArrowRight,
  Zap, Activity, Plus, BarChart3, Upload, RefreshCw, Megaphone,
  CheckCircle, PauseCircle, Clock, AlertCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getDashboardOverviewData } from '../../lib/api';
import { DashboardOverviewData } from '../../lib/analytics/types';

interface DashboardOverviewProps {
  onNavigate: (view: string) => void;
}

const iconMap: Record<string, React.ElementType> = {
  Zap, Eye, MousePointer, Target, Users, Megaphone, BarChart3,
};

const activityIconMap: Record<string, React.ElementType> = {
  impression:  Eye,
  click:       MousePointer,
  conversion:  CheckCircle,
  campaign_created:  Plus,
  campaign_paused:   PauseCircle,
  segment_updated:   Users,
  scheduled:         Clock,
};

const activityColorMap: Record<string, string> = {
  impression:        'text-blue-500',
  click:             'text-green-500',
  conversion:        'text-emerald-500',
  campaign_created:  'text-purple-500',
  campaign_paused:   'text-yellow-500',
  segment_updated:   'text-indigo-500',
  scheduled:         'text-orange-500',
};

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-card/50 border-0 shadow-sm">
            <CardHeader className="pb-2"><Skeleton className="h-4 w-2/3" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-1/2 mb-2" /><Skeleton className="h-3 w-1/3" /></CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-0 shadow-sm"><CardContent className="p-6"><Skeleton className="h-[280px]" /></CardContent></Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm"><CardContent className="p-6"><Skeleton className="h-[200px]" /></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-6"><Skeleton className="h-[200px]" /></CardContent></Card>
      </div>
    </div>
  );
}

export default function DashboardOverview({ onNavigate }: DashboardOverviewProps) {
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        const overviewData = await getDashboardOverviewData();
        if (!cancelled) { setData(overviewData); setError(null); }
      } catch (err) {
        if (!cancelled) setError('Failed to load dashboard data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (loading) return <OverviewSkeleton />;

  if (error || !data) {
    return (
      <Card className="text-center p-8 border-destructive/50 bg-destructive/10">
        <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
        <CardTitle className="text-destructive mb-2">Dashboard Unavailable</CardTitle>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{error || 'No data available.'}</p>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)}>
            <RefreshCw className="w-4 h-4 mr-2" />Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { kpis, performanceTrend, topCampaigns, recentActivity, totalUsers, totalSegments, activeCampaignsCount } = data;

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={() => onNavigate('create-campaign')}>
          <Plus className="w-4 h-4 mr-2" />New Campaign
        </Button>
        <Button size="sm" variant="outline" onClick={() => onNavigate('analytics')}>
          <BarChart3 className="w-4 h-4 mr-2" />View Analytics
        </Button>
        <Button size="sm" variant="outline" onClick={() => onNavigate('segments')}>
          <Users className="w-4 h-4 mr-2" />Manage Segments
        </Button>
        <Button size="sm" variant="outline" onClick={() => onNavigate('enrichment')}>
          <Upload className="w-4 h-4 mr-2" />Upload CSV Data
        </Button>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setRefreshKey(k => k + 1)}>
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </Button>
      </div>

      {/* Summary Badges */}
      {(totalUsers !== undefined || totalSegments !== undefined || activeCampaignsCount !== undefined) && (
        <div className="flex flex-wrap gap-3">
          {activeCampaignsCount !== undefined && (
            <Badge variant="secondary" className="text-sm px-3 py-1">
              <Zap className="w-3 h-3 mr-1 text-green-500" />
              {activeCampaignsCount} Active Campaigns
            </Badge>
          )}
          {totalSegments !== undefined && (
            <Badge variant="secondary" className="text-sm px-3 py-1">
              <Target className="w-3 h-3 mr-1 text-indigo-500" />
              {totalSegments} Segments
            </Badge>
          )}
          {totalUsers !== undefined && (
            <Badge variant="secondary" className="text-sm px-3 py-1">
              <Users className="w-3 h-3 mr-1 text-blue-500" />
              {totalUsers.toLocaleString()} Users
            </Badge>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => {
          const Icon = iconMap[kpi.icon] || Zap;
          const ChangeIcon = kpi.changeType === 'increase' ? TrendingUp : TrendingDown;
          const changeColor = kpi.changeType === 'increase' ? 'text-green-500' : 'text-red-500';
          return (
            <Card key={kpi.name} className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.name}</CardTitle>
                <Icon className="h-4 w-4 text-chart-1" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
                <p className={`text-xs flex items-center gap-0.5 mt-1 ${changeColor}`}>
                  <ChangeIcon className="w-3 h-3" />
                  {kpi.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Performance Trends Chart */}
      <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Performance Trends</span>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('analytics')}>
              View full analytics <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={performanceTrend}>
              <defs>
                <linearGradient id="impressionsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
              />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}
                labelFormatter={(v) => new Date(v).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}
              />
              <Legend />
              <Area type="monotone" dataKey="impressions" stroke="#6366f1" fillOpacity={1} fill="url(#impressionsGrad)" strokeWidth={2} name="Impressions" />
              <Area type="monotone" dataKey="clicks" stroke="#10b981" fillOpacity={1} fill="url(#clicksGrad)" strokeWidth={2} name="Clicks" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Campaigns & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Campaigns */}
        <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle>Top Performing Campaigns</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('campaigns')}>
              All <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {topCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Megaphone className="w-8 h-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No campaigns yet</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => onNavigate('create-campaign')}>
                  Create your first campaign
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {topCampaigns.slice(0, 5).map((campaign) => (
                  <div key={campaign.id}>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{campaign.name}</span>
                        {campaign.type && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 capitalize">
                            {campaign.type.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground text-xs shrink-0 ml-2">
                        {campaign.impressions.toLocaleString()}
                        {campaign.ctr !== undefined && (
                          <span className="text-green-600 ml-1">· {campaign.ctr.toFixed(1)}%</span>
                        )}
                      </span>
                    </div>
                    <Progress value={campaign.progress} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="w-8 h-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 7).map((activity, index) => {
                  const Icon = activityIconMap[activity.eventType] || Activity;
                  const color = activityColorMap[activity.eventType] || 'text-blue-500';
                  const label = activity.eventType.replace(/_/g, ' ');
                  const timeStr = activity.timestamp
                    ? new Date(activity.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    : '';
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`mt-0.5 shrink-0 ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium capitalize">{label}</span>
                          {activity.campaignName ? (
                            <> on <span className="font-medium">{activity.campaignName}</span></>
                          ) : activity.campaignId ? (
                            <> on <span className="font-medium text-xs text-muted-foreground">{activity.campaignId.slice(0, 12)}…</span></>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          User {activity.userId.substring(0, 12)}…{timeStr && ` · ${timeStr}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
