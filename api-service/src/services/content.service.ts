import { Injectable, Logger } from '@nestjs/common';
import { ContentClient } from '../clients/content.client';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(private readonly contentClient: ContentClient) {}

  // --- ADD THESE TWO NEW METHODS ---

  async generateUploadUrl(tenantId: string, fileName: string, mimeType: string, authToken?: string): Promise<any> {
    try {
      const response = await this.contentClient.generateSignedUploadUrl(tenantId, fileName, mimeType, authToken);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to generate upload URL from content-service');
      }
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to execute generateUploadUrl: ${error.message}`);
      throw error;
    }
  }

  async finalizeUpload(payload: any, tenantId: string, authToken?: string): Promise<any> {
    try {
      const response = await this.contentClient.finalizeUpload(payload, tenantId, authToken);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to finalize upload in content-service');
      }
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to execute finalizeUpload: ${error.message}`);
      throw error;
    }
  }

  // --- EXISTING METHODS BELOW ---

  async validateContent(contentId: string, tenantId: string): Promise<boolean> {
    try {
      const response = await this.contentClient.validateContent(contentId, tenantId);
      return response.success && response.data === true;
    } catch (error:any) {
      this.logger.error(`Content validation failed: ${error.message}`);
      return false;
    }
  }

  async getContentDetails(contentId: string, tenantId: string): Promise<any> {
    try {
      const response = await this.contentClient.getContentByIds([contentId], tenantId);
      if (!response.success || !response.data || response.data.length === 0) {
        throw new Error(response.error || 'Content not found');
      }
      return response.data[0];
    } catch (error:any) {
      this.logger.error(`Failed to get content details: ${error.message}`);
      throw error;
    }
  }

  async listContent(tenantId: string, page: number, limit: number, authToken?: string): Promise<any> {
    try {
      const response = await this.contentClient.listContent(tenantId, page, limit, authToken);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to list content from the content-service');
      }
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to execute listContent: ${error.message}`);
      throw error;
    }
  }

  async getContentByCampaign(campaignId: string, tenantId: string): Promise<any[]> {
    try {
      const response = await this.contentClient.getContentByCampaign(campaignId, tenantId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get campaign content');
      }
      return response.data;
    } catch (error:any) {
      this.logger.error(`Failed to get campaign content: ${error.message}`);
      throw error;
    }
  }
}