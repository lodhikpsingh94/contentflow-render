import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsClient } from '../clients/analytics.client';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly analyticsClient: AnalyticsClient) {}

  async trackImpression(
    contentId: string,
    campaignId: string,
    placementId: string,
    userId: string,
    sessionId: string,
    deviceInfo: any,
    tenantId: string,
    authToken?: string
  ): Promise<boolean> {
    try {
      const event = {
        eventType: 'BANNER_IMPRESSION',
        contentId,
        campaignId,
        placementId,
        userId,
        sessionId,
        deviceInfo,
        timestamp: new Date(),
      };

      const response = await this.analyticsClient.trackEvents([event], tenantId, authToken);
      
      if (!response.success) {
        this.logger.warn(`Failed to track impression: ${response.error}`);
        return false;
      }

      this.logger.debug(`Tracked impression for content: ${contentId}, user: ${userId}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Error tracking impression: ${error.message}`);
      return false;
    }
  }

  async trackClick(
    contentId: string,
    campaignId: string,
    placementId: string,
    userId: string,
    sessionId: string,
    deviceInfo: any,
    tenantId: string,
    authToken?: string
  ): Promise<boolean> {
    try {
      const event = {
        eventType: 'BANNER_CLICK',
        contentId,
        campaignId,
        placementId,
        userId,
        sessionId,
        deviceInfo,
        timestamp: new Date(),
      };

      const response = await this.analyticsClient.trackEvents([event], tenantId, authToken);
      
      if (!response.success) {
        this.logger.warn(`Failed to track click: ${response.error}`);
        return false;
      }

      this.logger.debug(`Tracked click for content: ${contentId}, user: ${userId}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Error tracking click: ${error.message}`);
      return false;
    }
  }

  async getAnalytics(
    tenantId: string,
    campaignId?: string,
    startDate?: string,
    endDate?: string,
    authToken?: string
  ): Promise<any> {
    try {
      const response = await this.analyticsClient.getAnalytics(
        tenantId,
        campaignId,
        startDate,
        endDate,
        authToken
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch analytics');
      }

      return response.data;
    } catch (error: any) {
      this.logger.error(`Error fetching analytics: ${error.message}`);
      throw error;
    }
  }

    // <--- ADD THIS METHOD
  async trackEventBatch(
    events: any[],
    tenantId: string,
    authToken?: string
  ): Promise<any> {
    try {
      // The AnalyticsClient already has a method 'trackEvents' which handles arrays
      const response = await this.analyticsClient.trackEvents(events, tenantId, authToken);
      
      if (!response.success) {
        this.logger.warn(`Failed to track batch events: ${response.error}`);
        throw new Error(response.error);
      }

      return response.data;
    } catch (error: any) {
      this.logger.error(`Error tracking batch events: ${error.message}`);
      throw error;
    }
  }
  async getDashboardData(tenantId: string, authToken?: string): Promise<any> {
    try {
      const response = await this.analyticsClient.getDashboardData(tenantId, authToken);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch dashboard data');
      }

      return response.data;
    } catch (error: any) {
      this.logger.error(`Error fetching dashboard data: ${error.message}`);
      throw error;
    }
  }
}

