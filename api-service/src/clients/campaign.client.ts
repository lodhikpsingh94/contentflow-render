import { Injectable, Logger  } from '@nestjs/common';
import { BaseClient } from './base.client';
import { ServiceResponse } from '../models/shared/common.types';

export interface Campaign {
  id: string;
  _id?: string; // <--- Added
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'ended' | 'draft';
  type?: string; // <--- Added
  subType?: string;
  rules: CampaignRules;
  contentIds: string[];
  priority: number;
  budget?: CampaignBudget;
  createdAt: Date;
  updatedAt: Date;
  metadata?: any; // <--- Added
}

export interface CampaignRules {
  segments: string[];
  schedule: Schedule;
  frequencyCapping: FrequencyCapping;
  targeting: TargetingRules;
  constraints: CampaignConstraints;
}

export interface Schedule {
  startTime: Date;
  endTime: Date;
  timezone: string;
}

export interface FrequencyCapping {
  maxImpressions: number;
  period: 'hour' | 'day' | 'week';
  perUser: boolean;
}

export interface TargetingRules {
  geo: GeoTargeting;
  devices: DeviceTargeting;
  userAttributes: UserAttributeTargeting;
  behavior: BehaviorTargeting;
}

export interface GeoTargeting {
  countries: string[];
  regions?: string[];
  cities?: string[];
  radius?: number; // in km
}

export interface DeviceTargeting {
  platforms: string[];
  osVersions: string[];
  appVersions: string[];
  deviceModels?: string[];
}

export interface UserAttributeTargeting {
  segments: string[];
  customAttributes: Record<string, any>;
  ageRange?: { min: number; max: number };
  genders?: string[];
  languages?: string[];
}

export interface BehaviorTargeting {
  minSessions?: number;
  hasPurchased?: boolean;
  lastActiveWithinDays?: number;
}

export interface CampaignConstraints {
  dailyBudget?: number;
  totalBudget?: number;
  maxImpressions?: number;
  maxClicks?: number;
}

export interface CampaignBudget {
  total: number;
  spent: number;
  dailyLimit: number;
  type: 'cpc' | 'cpm' | 'cpa';
}

@Injectable()
export class CampaignClient extends BaseClient {
  constructor() {
    super(
      `${process.env.CAMPAIGN_SERVICE_URL || 'http://localhost:3001'}/api/v1`, // <-- ADD PREFIX
      'CampaignClient',
      parseInt(process.env.CAMPAIGN_SERVICE_TIMEOUT || '10000')
    );
  }

  private get serviceAuthHeader(): { Authorization: string } {
    const token = process.env.INTERNAL_SERVICE_TOKEN;
    if (!token) {
      this.logger.warn('INTERNAL_SERVICE_TOKEN is not set — campaign service calls may be rejected');
    }
    return { Authorization: `Bearer ${token || ''}` };
  }

  async getActiveCampaigns(userContext: any, tenantId: string): Promise<ServiceResponse<Campaign[]>> {
    return this.request<Campaign[]>({
      method: 'POST',
      url: '/campaigns/evaluate',
      data: { ...userContext, tenantId },
    }, tenantId, this.serviceAuthHeader);
  }

  async getCampaignById(id: string, tenantId: string): Promise<ServiceResponse<Campaign>> {
    return this.request<Campaign>({
      method: 'GET',
      url: `/campaigns/${id}`,
    }, tenantId, this.serviceAuthHeader);
  }

  async validateCampaign(campaignId: string, tenantId: string): Promise<ServiceResponse<boolean>> {
    return this.request<boolean>({
      method: 'GET',
      url: `/campaigns/${campaignId}/validate`,
    }, tenantId, this.serviceAuthHeader);
  }

  async getCampaignsByTenant(
    tenantId: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
  ): Promise<ServiceResponse<{ campaigns: Campaign[]; total: number }>> {
    return this.request<{ campaigns: Campaign[]; total: number }>({
      method: 'GET',
      url: '/campaigns',
      params: { page, limit, status },
    }, tenantId, this.serviceAuthHeader);
  }

  async createCampaign(campaignData: any, tenantId: string): Promise<ServiceResponse<any>> {
    this.logger.debug(`Sending CREATE campaign request for tenant ${tenantId}`);
    return this.request<any>({
      method: 'POST',
      url: '/campaigns',
      data: campaignData,
    }, tenantId, this.serviceAuthHeader);
  }

  async updateCampaignStatus(campaignId: string, status: string, tenantId: string): Promise<ServiceResponse<any>> {
    return this.request<any>({
      method: 'PATCH',
      url: `/campaigns/${campaignId}`,
      data: { status },
    }, tenantId, this.serviceAuthHeader);
  }

  async updateCampaign(campaignId: string, campaignData: any, tenantId: string): Promise<ServiceResponse<any>> {
    this.logger.debug(`Sending UPDATE campaign request for tenant ${tenantId}`);
    return this.request<any>({
      method: 'PUT',
      url: `/campaigns/${campaignId}`,
      data: campaignData,
    }, tenantId, this.serviceAuthHeader);
  }
}