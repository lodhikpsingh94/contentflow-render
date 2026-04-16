export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive' | 'suspended';
  config: TenantConfig;
  features: TenantFeatures;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantConfig {
  maxUsers: number;
  maxCampaigns: number;
  contentTypes: string[];
  allowedDomains: string[];
  rateLimiting: RateLimitConfig;
  caching: CacheConfig;
  analytics: AnalyticsConfig;
}

export interface TenantFeatures {
  advancedTargeting: boolean;
  a_bTesting: boolean;
  analytics: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  customSegments: boolean;
  contentPreview: boolean;
  realTimeAnalytics: boolean;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstCapacity: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
}

export interface AnalyticsConfig {
  enabled: boolean;
  retentionDays: number;
  realTime: boolean;
}

export interface TenantContext {
  tenantId: string;
  tenant: Tenant;
  userId: string;
  userRoles: string[];
}