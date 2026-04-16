import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { TrendingUp, TrendingDown, Users, Eye, MousePointer, Target, ArrowRight, Zap, Activity, CheckCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getDashboardOverviewData } from '../../lib/api';
import { DashboardOverviewData } from '../../lib/types';
import { Skeleton } from '../ui/skeleton';

interface DashboardOverviewProps {
  onNavigate: (view: string) => void;
}

// Map icon names from backend to Lucide components
const iconMap: { [key: string]: React.ElementType } = {
  Zap, Eye, MousePointer, Target, Users
};

export default function DashboardOverview({ onNavigate }: DashboardOverviewProps) {
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const overviewData = await getDashboardOverviewData();
        setData(overviewData);
        setError(null);
      } catch (err) {
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div>Loading dashboard...</div>; // Replace with a skeleton loader if desired
  }

  if (error || !data) {
    return <div className="text-center text-destructive p-8">{error || "No data available."}</div>;
  }

  const { kpis, performanceTrend, topCampaigns, recentActivity } = data;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
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
                <p className={`text-xs flex items-center ${changeColor}`}>
                  <ChangeIcon className="w-3 h-3 mr-1" />
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
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={performanceTrend}>
                <defs>
                  <linearGradient id="impressionsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="impressions" stroke="var(--chart-1)" fillOpacity={1} fill="url(#impressionsGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      {/* Top Campaigns & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Top Performing Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCampaigns.map((campaign) => (
                <div key={campaign.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{campaign.name}</span>
                    <span className="text-muted-foreground">{campaign.impressions.toLocaleString()} impressions</span>
                  </div>
                  <Progress value={campaign.progress} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="mt-1"><Activity className="w-4 h-4 text-blue-500" /></div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.eventType}</span> on campaign <span className="font-medium">{activity.campaignId}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      by {activity.userId.substring(0, 15)}...
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}