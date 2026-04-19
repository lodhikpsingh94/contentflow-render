import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { BarChart2 } from 'lucide-react';
import {
  TrendingUp, TrendingDown, Users, MousePointer, Eye, Target, ArrowUpDown,
  RefreshCw, Download
} from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { getAnalyticsDashboardData } from '../../lib/api';
import { AnalyticsData, CampaignPerformanceRow } from '../../lib/analytics/types';

const iconMap: Record<string, React.ElementType> = {
  'Total Impressions': Eye,
  'Total Clicks': MousePointer,
  'Conversions': TrendingUp,
  'Click Rate': Target,
  'Conversion Rate': Users,
};

const TYPE_COLORS: Record<string, string> = {
  banner: '#6366f1',
  video: '#ec4899',
  popup: '#f59e0b',
  inapp_notification: '#10b981',
  push_notification: '#3b82f6',
  sms: '#8b5cf6',
  whatsapp: '#22c55e',
};

const DATE_RANGES = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

type SortKey = 'impressions' | 'clicks' | 'conversions' | 'ctr' | 'spend';

function CampaignTable({ rows }: { rows: CampaignPerformanceRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('impressions');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = [...rows].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortDir === 'asc' ? diff : -diff;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="text-left p-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
      onClick={() => handleSort(k)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className="w-3 h-3" />
      </span>
    </th>
  );

  const statusColor: Record<string, string> = {
    active: 'bg-green-500/20 text-green-600',
    paused: 'bg-yellow-500/20 text-yellow-600',
    ended: 'bg-muted text-muted-foreground',
    draft: 'bg-blue-500/20 text-blue-600',
    approved: 'bg-green-500/20 text-green-600',
    scheduled: 'bg-purple-500/20 text-purple-600',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border">
          <tr>
            <th className="text-left p-3 text-xs font-medium text-muted-foreground">Campaign</th>
            <SortHeader label="Impressions" k="impressions" />
            <SortHeader label="Clicks" k="clicks" />
            <SortHeader label="CTR %" k="ctr" />
            <SortHeader label="Conversions" k="conversions" />
            <SortHeader label="Spend (SAR)" k="spend" />
            <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={row.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
              <td className="p-3">
                <div className="font-medium text-foreground">{row.name}</div>
                <div className="text-xs text-muted-foreground capitalize">{row.type.replace('_', ' ')}</div>
              </td>
              <td className="p-3 text-foreground">{row.impressions.toLocaleString()}</td>
              <td className="p-3 text-foreground">{row.clicks.toLocaleString()}</td>
              <td className="p-3">
                <span className={row.ctr >= 2 ? 'text-green-600 font-medium' : row.ctr < 0.5 ? 'text-red-500' : 'text-foreground'}>
                  {row.ctr.toFixed(2)}%
                </span>
              </td>
              <td className="p-3 text-foreground">{row.conversions.toLocaleString()}</td>
              <td className="p-3 text-foreground">{row.spend > 0 ? `${row.spend.toLocaleString()} ﷼` : '—'}</td>
              <td className="p-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[row.status] ?? 'bg-muted text-muted-foreground'}`}>
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState(7);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        const analyticsData = await getAnalyticsDashboardData(selectedDays);
        if (!cancelled) {
          setData(analyticsData);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Unexpected error';
          setError(`Failed to load analytics. ${msg}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [selectedDays, refreshKey]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-2/3" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-1/2 mb-2" /><Skeleton className="h-3 w-1/3" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardContent className="p-6"><Skeleton className="h-[250px] w-full rounded-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-[250px] w-full" /></CardContent></Card>
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-[200px] w-full" /></CardContent></Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center p-8 border-destructive/50 bg-destructive/10">
        <CardTitle className="text-destructive mb-3">Failed to Load Analytics</CardTitle>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.kpiCards.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-12">
        <BarChart2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium mb-2">No analytics data yet</p>
        <p className="text-sm">Data will appear once your campaigns start receiving impressions.</p>
      </div>
    );
  }

  const { kpiCards, performanceTrend, campaignTypeDistribution, campaignPerformance = [], segmentPerformance = [] } = data;

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {DATE_RANGES.map(r => (
            <button
              key={r.days}
              onClick={() => setSelectedDays(r.days)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedDays === r.days
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = iconMap[kpi.metric] || Eye;
          const ChangeIcon = kpi.changeType === 'increase' ? TrendingUp : TrendingDown;
          const changeColor = kpi.changeType === 'increase' ? 'text-green-500' : 'text-red-500';
          return (
            <Card key={kpi.metric} className="bg-card/50 border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.metric}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className={`text-xs flex items-center gap-0.5 mt-1 ${changeColor}`}>
                  <ChangeIcon className="w-3 h-3" />
                  {kpi.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Performance Trends */}
      <Card className="bg-card/50 border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Performance Trends — Last {selectedDays} Days</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
              />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip
                labelFormatter={(v) => new Date(v).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}
              />
              <Legend />
              <Line type="monotone" dataKey="impressions" stroke="#6366f1" strokeWidth={2} dot={false} name="Impressions" />
              <Line type="monotone" dataKey="clicks"      stroke="#10b981" strokeWidth={2} dot={false} name="Clicks" />
              <Line type="monotone" dataKey="conversions" stroke="#f59e0b" strokeWidth={2} dot={false} name="Conversions" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Campaign Type Distribution + Segment Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Campaign Types by Impression</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={campaignTypeDistribution}
                  cx="50%" cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                  dataKey="value"
                  nameKey="name"
                  labelLine={false}
                  label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                >
                  {campaignTypeDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color ?? TYPE_COLORS[entry.name] ?? '#6366f1'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {segmentPerformance.length > 0 ? (
          <Card className="bg-card/50 border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Top Segments by Click Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={segmentPerformance.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} width={100} />
                  <Tooltip
                    formatter={(v: any) => [`${Number(v).toFixed(2)}%`, 'CTR']}
                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}
                  />
                  <Bar dataKey="ctr" fill="#6366f1" radius={[0, 4, 4, 0]} name="CTR %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card/50 border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Top Segments by Click Rate</CardTitle>
            </CardHeader>
            <CardContent className="flex h-[250px] items-center justify-center">
              <p className="text-muted-foreground text-sm">Segment data available once segments are active</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Campaign Performance Table */}
      {campaignPerformance.length > 0 && (
        <Card className="bg-card/50 border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Campaign Performance</CardTitle>
            <span className="text-xs text-muted-foreground">{campaignPerformance.length} campaigns</span>
          </CardHeader>
          <CardContent className="p-0">
            <CampaignTable rows={campaignPerformance} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

