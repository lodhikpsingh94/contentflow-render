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
      `${process.env.SEGMENT_SERVICE_URL || 'http://localhost:3003'}/api/v1`,
      'SegmentClient',
      parseInt(process.env.SEGMENT_SERVICE_TIMEOUT || '6000')
    );
  }

  private get serviceAuthHeader(): { Authorization: string } {
    const token = process.env.INTERNAL_SERVICE_TOKEN;
    if (!token) {
      this.logger.warn('INTERNAL_SERVICE_TOKEN is not set — segment service calls may be rejected');
    }
    return { Authorization: `Bearer ${token || ''}` };
  }

  async getUserSegments(userId: string, tenantId: string): Promise<ServiceResponse<UserSegment>> {
    return this.request<UserSegment>({
      method: 'GET',
      url: `/users/${userId}/segments`,
    }, tenantId, this.serviceAuthHeader);
  }

  async createSegment(segmentData: any, tenantId: string): Promise<ServiceResponse<any>> {
    return this.request<any>({
      method: 'POST',
      url: '/segments',
      data: segmentData,
    }, tenantId, this.serviceAuthHeader);
  }

  async getSegments(tenantId: string): Promise<ServiceResponse<any>> {
    return this.request<any>({
      method: 'GET',
      url: '/segments',
    }, tenantId, this.serviceAuthHeader);
  }

  async getSegmentById(segmentId: string, tenantId: string): Promise<ServiceResponse<any>> {
    return this.request<any>({
      method: 'GET',
      url: `/segments/${segmentId}`,
    }, tenantId, this.serviceAuthHeader);
  }

  async evaluateUserSegments(userContext: any, tenantId: string): Promise<ServiceResponse<string[]>> {
    return this.request<string[]>({
      method: 'POST',
      url: '/segments/evaluate',
      data: { ...userContext, tenantId },
    }, tenantId, this.serviceAuthHeader);
  }

  async estimateAudience(
    rules: SegmentRule[],
    logicalOperator: 'AND' | 'OR' = 'AND',
    tenantId: string,
  ): Promise<ServiceResponse<AudienceEstimate>> {
    return this.request<AudienceEstimate>({
      method: 'POST',
      url: '/segments/estimate',
      data: { rules, logicalOperator },
    }, tenantId, this.serviceAuthHeader);
  }

  /**
   * Fetch every enrichment attribute key/type that has been uploaded for the tenant.
   */
  async getEnrichmentAttributes(tenantId: string): Promise<ServiceResponse<any[]>> {
    return this.request<any[]>({
      method: 'GET',
      url: '/enrichment/attributes',
    }, tenantId, this.serviceAuthHeader);
  }

  async getSegmentDefinitions(tenantId: string): Promise<ServiceResponse<SegmentDefinition[]>> {
    return this.request<SegmentDefinition[]>({
      method: 'GET',
      url: '/segments',
    }, tenantId, this.serviceAuthHeader);
  }

  async createUserSegment(userId: string, segmentId: string, tenantId: string): Promise<ServiceResponse<boolean>> {
    return this.request<boolean>({
      method: 'POST',
      url: `/users/${userId}/segments/${segmentId}`,
    }, tenantId, this.serviceAuthHeader);
  }
}