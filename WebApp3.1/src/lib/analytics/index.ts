import { fetchFromApi } from '../api';
import { AnalyticsData, DashboardOverviewData } from './types';

export * from './types';

export const getAnalyticsDashboardData = (days: number = 7): Promise<AnalyticsData> => {
  return fetchFromApi<AnalyticsData>(`/analytics/dashboard?days=${days}`);
};

export const getDashboardOverviewData = (): Promise<DashboardOverviewData> => {
  return fetchFromApi<DashboardOverviewData>('/dashboard/overview');
};