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

  private get serviceAuthHeader(): { Authorization: string } {
    const token = process.env.INTERNAL_SERVICE_TOKEN;
    if (!token) {
      this.logger.warn('INTERNAL_SERVICE_TOKEN is not set — analytics calls will be rejected');
    }
    return { Authorization: `Bearer ${token || ''}` };
  }

  async trackEvents(events: AnalyticsEvent[], tenantId: string): Promise<ServiceResponse<any>> {
    return this.request<any>({
      method: 'POST',
      url: '/analytics/events',
      data: { events },
    }, tenantId, this.serviceAuthHeader);
  }

  async getAnalytics(
    tenantId: string,
    campaignId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ServiceResponse<any>> {
    const params: any = {};
    if (campaignId) params.campaignId = campaignId;
    if (startDate)  params.startDate  = startDate;
    if (endDate)    params.endDate    = endDate;

    return this.request<any>(
      { method: 'GET', url: '/analytics', params },
      tenantId,
      this.serviceAuthHeader,
    );
  }

  async getDashboardData(tenantId: string, days: number = 7): Promise<ServiceResponse<any>> {
    return this.request<any>(
      { method: 'GET', url: '/analytics/dashboard', params: { days } },
      tenantId,
      this.serviceAuthHeader,
    );
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
