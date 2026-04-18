import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Tenant, TenantConfig, TenantFeatures } from '../models/shared/tenant.types';
import { Cache } from '../utils/cache';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);
  private readonly tenants = new Map<string, Tenant>();

  constructor(private readonly cache: Cache) {
    this.initializeSampleTenants();
  }

  async getTenantById(tenantId: string): Promise<Tenant | null> {
    // Check cache first
    const cacheKey = `tenant:${tenantId}`;
    const cached = await this.cache.get<Tenant>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for tenant: ${tenantId}`);
      return cached;
    }

    // In production, this would fetch from a database
    const tenant = this.tenants.get(tenantId);
    if (tenant) {
      await this.cache.set(cacheKey, tenant, 300); // Cache for 5 minutes
      this.logger.debug(`Tenant loaded from storage: ${tenantId}`);
    } else {
      this.logger.warn(`Tenant not found: ${tenantId}`);
    }

    return tenant || null;
  }

  async validateTenantAccess(tenantId: string, feature: keyof TenantFeatures): Promise<boolean> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const hasAccess = tenant.features[feature] === true;
    if (!hasAccess) {
      this.logger.warn(`Tenant ${tenantId} does not have access to feature: ${feature}`);
    }

    return hasAccess;
  }

  async getTenantConfig(tenantId: string): Promise<TenantConfig> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }
    return tenant.config;
  }

  async isTenantActive(tenantId: string): Promise<boolean> {
    const tenant = await this.getTenantById(tenantId);
    return tenant?.status === 'active';
  }

  async getAllActiveTenants(): Promise<Tenant[]> {
    return Array.from(this.tenants.values()).filter(tenant => tenant.status === 'active');
  }

  private initializeSampleTenants() {
    const tenants: Tenant[] = [
      {
        id: 'tenant1',
        name: 'Acme Corporation',
        slug: 'acme',
        status: 'active',
        config: {
          maxUsers: 10000,
          maxCampaigns: 100,
          contentTypes: ['banner', 'video', 'popup'],
          allowedDomains: ['acme.com', 'app.acme.com'],
          rateLimiting: {
            requestsPerMinute: 1000,
            requestsPerHour: 10000,
            burstCapacity: 100
          },
          caching: {
            enabled: true,
            ttl: 300,
            maxSize: 100000
          },
          analytics: {
            enabled: true,
            retentionDays: 90,
            realTime: true
          }
        },
        features: {
          advancedTargeting: true,
          a_bTesting: true,
          analytics: true,
          pushNotifications: true,
          smsNotifications: false,
          customSegments: true,
          contentPreview: true,
          realTimeAnalytics: true
        },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      },
      {
        id: 'tenant2',
        name: 'Startup Inc',
        slug: 'startup',
        status: 'active',
        config: {
          maxUsers: 1000,
          maxCampaigns: 10,
          contentTypes: ['banner', 'popup'],
          allowedDomains: ['startup.com'],
          rateLimiting: {
            requestsPerMinute: 100,
            requestsPerHour: 1000,
            burstCapacity: 10
          },
          caching: {
            enabled: true,
            ttl: 60,
            maxSize: 10000
          },
          analytics: {
            enabled: true,
            retentionDays: 30,
            realTime: false
          }
        },
        features: {
          advancedTargeting: false,
          a_bTesting: false,
          analytics: true,
          pushNotifications: false,
          smsNotifications: false,
          customSegments: false,
          contentPreview: false,
          realTimeAnalytics: false
        },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      },
      {
        id: 'tenant3',
        name: 'Enterprise Solutions',
        slug: 'enterprise',
        status: 'inactive',
        config: {
          maxUsers: 100000,
          maxCampaigns: 1000,
          contentTypes: ['banner', 'video', 'popup', 'notification'],
          allowedDomains: ['enterprise.com'],
          rateLimiting: {
            requestsPerMinute: 10000,
            requestsPerHour: 100000,
            burstCapacity: 1000
          },
          caching: {
            enabled: true,
            ttl: 600,
            maxSize: 1000000
          },
          analytics: {
            enabled: true,
            retentionDays: 365,
            realTime: true
          }
        },
        features: {
          advancedTargeting: true,
          a_bTesting: true,
          analytics: true,
          pushNotifications: true,
          smsNotifications: true,
          customSegments: true,
          contentPreview: true,
          realTimeAnalytics: true
        },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      }
    ];

    tenants.forEach(tenant => this.tenants.set(tenant.id, tenant));
    this.logger.log(`Initialized ${tenants.length} sample tenants`);
  }
}