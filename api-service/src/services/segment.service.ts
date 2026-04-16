import { Injectable, Logger } from '@nestjs/common';
import { SegmentClient } from '../clients/segment.client';

@Injectable()
export class SegmentService {
  private readonly logger = new Logger(SegmentService.name);

  constructor(private readonly segmentClient: SegmentClient) {}

  async getUserSegments(userId: string, tenantId: string): Promise<string[]> {
    try {
      const response = await this.segmentClient.getUserSegments(userId, tenantId);
      if (!response.success || !response.data) {
        throw new Error(response.error);
      }
      return response.data.segments;
    } catch (error:any) {
      this.logger.error(`Failed to get user segments: ${error.message}`);
      return [];
    }
  }

  async getUserProfile(userId: string, tenantId: string): Promise<any> {
    try {
      const response = await this.segmentClient.getUserSegments(userId, tenantId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    } catch (error:any) {
      this.logger.error(`Failed to get user profile: ${error.message}`);
      throw error;
    }
  }
  async createSegment(segmentData: any, tenantId: string, authToken?: string): Promise<any> {
    try {
      const response = await this.segmentClient.createSegment(segmentData, tenantId, authToken);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Segment creation failed in downstream service.');
      }
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to create segment: ${error.message}`);
      throw error;
    }
  }
    // --- ADD THIS METHOD ---
  async getSegments(tenantId: string, authToken?: string): Promise<any> {
    try {
      const response = await this.segmentClient.getSegments(tenantId, authToken);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get segments from downstream service.');
      }
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to get segments list: ${error.message}`);
      throw error;
    }
  }

    // --- ADD THIS METHOD ---
  async getSegmentById(segmentId: string, tenantId: string, authToken?: string): Promise<any> {
    const response = await this.segmentClient.getSegmentById(segmentId, tenantId, authToken);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get segment details.');
    }
    return response.data;
  }
  async evaluateUserSegments(userContext: any, tenantId: string): Promise<string[]> {
    try {
      const response = await this.segmentClient.evaluateUserSegments(userContext, tenantId);
      if (!response.success || !response.data) {
        throw new Error(response.error);
      }
      return response.data;
    } catch (error:any) {
      this.logger.error(`Failed to evaluate user segments: ${error.message}`);
      return [];
    }
  }

  async getSegmentDefinitions(tenantId: string): Promise<any[]> {
    try {
      const response = await this.segmentClient.getSegmentDefinitions(tenantId);
      if (!response.success || !response.data) {
        throw new Error(response.error);
      }
      return response.data;
    } catch (error:any) {
      this.logger.error(`Failed to get segment definitions: ${error.message}`);
      return [];
    }
  }
}