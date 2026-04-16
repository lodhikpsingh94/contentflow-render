import { Injectable, Logger } from '@nestjs/common';
import { CampaignClient } from '../clients/campaign.client';

@Injectable()
export class CampaignService {
  async deleteCampaign(campaignId: string, tenantId: string, authToken: string | undefined) {
    throw new Error('Method not implemented.');
  }
  
  private readonly logger = new Logger(CampaignService.name);

  constructor(private readonly campaignClient: CampaignClient) {}

  async validateCampaign(campaignId: string, tenantId: string): Promise<boolean> {
    try {
      const response = await this.campaignClient.validateCampaign(campaignId, tenantId);
      return response.success && response.data === true;
    } catch (error: any) {
      this.logger.error(`Campaign validation failed: ${error.message}`);
      return false;
    }
  }

  async getCampaignDetails(campaignId: string, tenantId: string,authToken?: string): Promise<any> {
    try {
      const response = await this.campaignClient.getCampaignById(campaignId, tenantId, authToken);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to get campaign details: ${error.message}`);
      throw error;
    }
  }

  async getCampaigns(
    tenantId: string, 
    page: number = 1, 
    limit: number = 10, 
    status: string | undefined, // The status from the controller is now used
    authToken?: string
  ): Promise<any> {
    try {
      // Pass the 'status' parameter to the client call. If it's undefined,
      // the campaign-service will return all campaigns.
      const response = await this.campaignClient.getCampaignsByTenant(
        tenantId, 
        page, 
        limit,
        status, // Pass the status through
        authToken
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get campaigns from downstream service.');
      }
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to get campaigns: ${error.message}`);
      throw error;
    }
   }
     // --- ADD THIS METHOD ---
  async createCampaign(campaignData: any, tenantId: string, authToken?: string): Promise<any> {
    try {
      const response = await this.campaignClient.createCampaign(campaignData, tenantId, authToken);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Campaign creation failed in downstream service.');
      }
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to create campaign: ${error.message}`);
      throw error;
    }
  }
    async updateCampaignStatus(campaignId: string, status: string, tenantId: string, authToken?: string): Promise<any> {
    try {
      const response = await this.campaignClient.updateCampaignStatus(campaignId, status, tenantId, authToken);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update campaign status.');
      }
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to update status for campaign ${campaignId}: ${error.message}`);
      throw error;
    }
  }
  
  async updateCampaign(campaignId: string, campaignData: any, tenantId: string, authToken?: string): Promise<any> {
    try {
      // In a real scenario, you might fetch segment rules here just like in createCampaign
      const response = await this.campaignClient.updateCampaign(campaignId, campaignData, tenantId, authToken);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update campaign.');
      }
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to update campaign ${campaignId}: ${error.message}`);
      throw error;
    }
  }
}