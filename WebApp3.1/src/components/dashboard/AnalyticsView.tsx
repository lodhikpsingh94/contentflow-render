import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  TrendingUp, Users, MousePointer, Eye, Target, TrendingDown
} from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { getAnalyticsDashboardData } from '../../lib/api';
import { AnalyticsData } from '../../lib/types';

// A helper to map metric names from the API to the correct Lucide icons
const iconMap: { [key: string]: React.ElementType } = {
  'Total Impressions': Eye,
  'Total Clicks': MousePointer,
  'Conversions': TrendingUp,
  'Click Rate': Target,
  'Conversion Rate': Users
};

export default function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const analyticsData = await getAnalyticsDashboardData();
        setData(analyticsData);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(`Failed to load analytics data. ${errorMessage}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // The empty dependency array ensures this runs only once on component mount

  // --- Conditional Rendering ---

  // 1. Loading State UI
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-2/3" /></CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/2 mb-2" />
                <Skeleton className="h-3 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardContent className="p-6"><Skeleton className="h-[250px] w-full rounded-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-[250px] w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  // 2. Error State UI
  if (error) {
    return (
      <Card className="text-center p-8 border-destructive/50 bg-destructive/10">
        <CardTitle className="text-destructive">An Error Occurred</CardTitle>
        <CardContent className="mt-4">
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  // 3. No Data State UI
  if (!data || data.kpiCards.length === 0) {
    return <div className="text-center text-muted-foreground p-8">No analytics data available yet.</div>;
  }
  
  const { kpiCards, performanceTrend, campaignTypeDistribution } = data;

  // 4. Success State UI (Main component render with live data)
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = iconMap[kpi.metric] || Eye;
          const ChangeIcon = kpi.changeType === 'increase' ? TrendingUp : TrendingDown;
          const changeColor = kpi.changeType === 'increase' ? 'text-green-500' : 'text-red-500';

          return (
            <Card key={kpi.metric}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.metric}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className={`text-xs text-muted-foreground flex items-center ${changeColor}`}>
                  <ChangeIcon className="w-3 h-3 mr-1" />
                  {kpi.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}
              />
              <Legend />
              <Line type="monotone" dataKey="impressions" stroke="#8884d8" strokeWidth={2} name="Impressions" />
              <Line type="monotone" dataKey="clicks" stroke="#82ca9d" strokeWidth={2} name="Clicks" />
              <Line type="monotone" dataKey="conversions" stroke="#ffc658" strokeWidth={2} name="Conversions" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Campaign Types Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Types (by Impression)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={campaignTypeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {campaignTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Placeholder for future segment performance chart */}
        <Card>
          <CardHeader>
            <CardTitle>Performance by Segment</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[250px] items-center justify-center">
            <p className="text-muted-foreground">Data coming soon</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}