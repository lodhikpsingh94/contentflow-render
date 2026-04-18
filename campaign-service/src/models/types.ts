export interface TenantContext {
  tenantId: string;
  userId: string;
  userRoles: string[];
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    responseTime: number;
    total?: number;
    [key: string]: any;
  };
}

export interface CampaignEvaluationRequest {
  tenantId: string;
  userId: string;
  segments: string[];
  placementId?: string; // <-- ADD THIS
  attributes: UserAttributes;
  device: DeviceInfo;
  location?: LocationData;
  context?: Record<string, any>;
  timestamp: Date;
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
}

export interface BehavioralData {
  totalSessions: number;
  lastSession: Date;
  purchaseCount: number;
  totalSpent: number;
}

export interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  osVersion: string;
  appVersion: string;
  deviceModel: string;
}

export interface LocationData {
  country: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface CampaignEvaluationResult {
  campaignId: string;
  eligible: boolean;
  reason?: string;
  score: number;
  constraints?: {
    budgetExceeded: boolean;
    frequencyCapped: boolean;
    scheduleValid: boolean;
  };
}