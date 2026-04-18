import { Injectable } from '@nestjs/common';
import { BaseClient } from './base.client';
import { ServiceResponse } from '../models/shared/common.types';

export interface AnalyticsEvent {
  eventId?: string;
  eventType: string;
  contentId: string;
  campaignId: string;
  placementId: string;
  userId: string;
  sessionId: string;
  deviceInfo: any;
  eventData?: any;
  timestamp?: Date;
}

@Injectable()
export class AnalyticsClient extends BaseClient {
  constructor() {
    super(
      `${process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3005'}/api/v1`,
      'AnalyticsClient',
      parseInt(process.env.ANALYTICS_SERVICE_TIMEOUT || '15000')
    );
  }

  async trackEvents(events: AnalyticsEvent[], tenantId: string, authToken?: string): Promise<ServiceResponse<any>> {
    const forwardedHeaders = authToken ? { Authorization: authToken } : undefined;
    
    return this.request<any>({
      method: 'POST',
      url: '/analytics/events',
      data: { events },
    }, tenantId, forwardedHeaders);
  }

  async getAnalytics(
    tenantId: string, 
    campaignId?: string, 
    startDate?: string, 
    endDate?: string,
    authToken?: string
  ): Promise<ServiceResponse<any>> {
    const forwardedHeaders = authToken ? { Authorization: authToken } : undefined;
    const params: any = {};
    if (campaignId) params.campaignId = campaignId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    return this.request<any>({
      method: 'GET',
      url: '/analytics',
      params,
    }, tenantId, forwardedHeaders);
  }

  async getDashboardData(tenantId: string, authToken?: string, days: number = 7): Promise<ServiceResponse<any>> {
    const forwardedHeaders = authToken ? { Authorization: authToken } : undefined;

    return this.request<any>({
      method: 'GET',
      url: '/analytics/dashboard',
      params: { days },
    }, tenantId, forwardedHeaders);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}