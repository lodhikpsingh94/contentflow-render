import { Injectable } from '@nestjs/common';
import { BaseClient } from './base.client';
import { ServiceResponse } from '../models/shared/common.types';

export interface UserSegment {
  userId: string;
  segments: string[];
  attributes: UserAttributes;
  lastUpdated: Date;
  metadata: UserMetadata;
}

export interface UserAttributes {
  demographic: DemographicData;
  behavioral: BehavioralData;
  custom: Record<string, any>;
}

export interface DemographicData {
  age?: number;
  gender?: string;
  country: string;
  language: string;
  timezone: string;
  subscriptionTier?: string;
}

export interface BehavioralData {
  totalSessions: number;
  lastSession: Date;
  purchaseCount: number;
  totalSpent: number;
  averageOrderValue: number;
  lastPurchaseDate?: Date;
  favoriteCategories: string[];
  engagementScore: number;
}

export interface UserMetadata {
  accountAgeDays: number;
  isPremium: boolean;
  isNewUser: boolean;
  isActive: boolean;
  lastActivity: Date;
}

export interface SegmentDefinition {
  id: string;
  name: string;
  description: string;
  rules: SegmentRule[];
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentRule {
  field: string;
  operator: string;
  value: any;
}

export interface AudienceEstimate {
  estimatedCount: number;
  totalUsers: number;
  percentage: number;
  breakdown: Array<{
    field: string;
    operator: string;
    value: any;
    matchCount: number;
  }>;
}

@Injectable()
export class SegmentClient extends BaseClient {
  constructor() {
    super(
      `${process.env.SEGMENT_SERVICE_URL || 'http://localhost:3003'}/api/v1`, // <-- ADD THE /API/V1 PREFIX
      'SegmentClient',
      parseInt(process.env.SEGMENT_SERVICE_TIMEOUT || '6000')
    );
  }

  async getUserSegments(userId: string, tenantId: string): Promise<ServiceResponse<UserSegment>> {
    return this.request<UserSegment>({
      method: 'GET',
      url: `/users/${userId}/segments`,
      headers: {
        'X-Tenant-Id': tenantId,
      },
    }, tenantId);
  }

  async createSegment(segmentData: any, tenantId: string, authToken?: string): Promise<ServiceResponse<any>> {
    const forwardedHeaders = authToken ? { Authorization: authToken } : undefined;

    return this.request<any>({
      method: 'POST',
      url: '/segments', // This calls POST /api/v1/segments on the user-segmentation-service
      data: segmentData,
    }, tenantId, forwardedHeaders);
  }

    async getSegments(tenantId: string, authToken?: string): Promise<ServiceResponse<any>> {
    const forwardedHeaders = authToken ? { Authorization: authToken } : undefined;

    return this.request<any>({
      method: 'GET',
      url: '/segments', // This calls GET /api/v1/segments on the user-segmentation-service
    }, tenantId, forwardedHeaders);
  }

    // --- ADD THIS METHOD ---
  async getSegmentById(segmentId: string, tenantId: string, authToken?: string): Promise<ServiceResponse<any>> {
    const forwardedHeaders = authToken ? { Authorization: authToken } : undefined;
    return this.request<any>({
      method: 'GET',
      url: `/segments/${segmentId}`, // Calls GET /api/v1/segments/:id
    }, tenantId, forwardedHeaders);
  }

  async evaluateUserSegments(userContext: any, tenantId: string, authToken?: string): Promise<ServiceResponse<string[]>> {
    const headers: Record<string, string> = {
      'X-Tenant-Id': tenantId
    };

    // Forward the auth token correctly
    if (authToken) {
      if (authToken.startsWith('Bearer ')) {
        headers['Authorization'] = authToken;
      } else {
        // If it's not a Bearer token, treat it as an API Key
        headers['X-API-Key'] = authToken;
      }
    } else {
      // FALLBACK: If no token provided by SDK, use the test key for internal communication
      // This is crucial if your OrchestrationService calls this without passing a token sometimes
      headers['X-API-Key'] = 'tenant1_key_123';
    }

    return this.request<string[]>({
      method: 'POST',
      url: '/segments/evaluate',
      data: {
        ...userContext,
        tenantId,
      },
      headers: headers, // <--- Explicitly pass headers
    }, tenantId);
  }

  async estimateAudience(
    rules: SegmentRule[],
    logicalOperator: 'AND' | 'OR' = 'AND',
    tenantId: string,
    authToken?: string
  ): Promise<ServiceResponse<AudienceEstimate>> {
    const forwardedHeaders = authToken ? { Authorization: authToken } : undefined;
    return this.request<AudienceEstimate>({
      method: 'POST',
      url: '/segments/estimate',
      data: { rules, logicalOperator },
    }, tenantId, forwardedHeaders);
  }

  /**
   * Fetch every enrichment attribute key/type that has been uploaded for the
   * tenant.  Used by the segment rule-builder to populate the dynamic
   * "Custom Data (CSV)" field group.
   */
  async getEnrichmentAttributes(tenantId: string, authToken?: string): Promise<ServiceResponse<any[]>> {
    const forwardedHeaders = authToken ? { Authorization: authToken } : undefined;
    return this.request<any[]>({
      method: 'GET',
      url: '/enrichment/attributes',
    }, tenantId, forwardedHeaders);
  }

  async getSegmentDefinitions(tenantId: string): Promise<ServiceResponse<SegmentDefinition[]>> {
    return this.request<SegmentDefinition[]>({
      method: 'GET',
      url: '/segments',
      headers: {
        'X-Tenant-Id': tenantId,
      },
    }, tenantId);
  }

  async createUserSegment(userId: string, segmentId: string, tenantId: string): Promise<ServiceResponse<boolean>> {
    return this.request<boolean>({
      method: 'POST',
      url: `/users/${userId}/segments/${segmentId}`,
      headers: {
        'X-Tenant-Id': tenantId,
      },
    }, tenantId);
  }
}