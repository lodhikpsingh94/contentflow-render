import { fetchFromApi } from '../api';
import { AnalyticsData, DashboardOverviewData } from './types';

export const getAnalyticsDashboardData = (): Promise<AnalyticsData> => {
  // This endpoint needs to be created in your api-service
  return fetchFromApi<AnalyticsData>('/analytics/dashboard');
};

export const getDashboardOverviewData = (): Promise<DashboardOverviewData> => {
  // This endpoint needs to be created in your api-service
  return fetchFromApi<DashboardOverviewData>('/dashboard/overview');
};