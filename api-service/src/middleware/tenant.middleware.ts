import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../services/tenant.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(private readonly tenantService: TenantService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Extract tenant identifier from various sources
      const tenantId = this.extractTenantId(req);
      
      if (!tenantId) {
        this.logger.warn('Tenant identifier required');
        return res.status(400).json({
          success: false,
          error: {
            message: 'Tenant identifier required. Provide tenant ID via X-Tenant-Id header, tenantId query parameter, or API key',
            code: 'MISSING_TENANT_ID',
            timestamp: new Date()
          }
        });
      }

      // Validate and load tenant
      const tenant = await this.tenantService.getTenantById(tenantId);
      if (!tenant) {
        this.logger.warn(`Tenant not found: ${tenantId}`);
        return res.status(404).json({
          success: false,
          error: {
            message: `Tenant not found: ${tenantId}`,
            code: 'TENANT_NOT_FOUND',
            timestamp: new Date()
          }
        });
      }

      // Set tenant context in request
      req['tenantContext'] = {
        tenantId: tenant.id,
        tenant,
        userId: req.headers['x-user-id'] as string,
        userRoles: (req.headers['x-user-roles'] as string)?.split(',') || []
      };

      this.logger.debug(`Tenant context set: ${tenantId} for path: ${req.path}`);
      next();
    } catch (error:any) {
      this.logger.error(`Tenant middleware error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Tenant resolution failed',
          code: 'TENANT_RESOLUTION_ERROR',
          timestamp: new Date()
        }
      });
    }
  }

  private extractTenantId(req: Request): string | null {
    // Priority order: header > query parameter > API key > subdomain
    return (
      req.headers['x-tenant-id'] as string ||
      req.query.tenantId as string ||
      this.extractFromApiKey(req) ||
      this.extractFromDomain(req)
    );
  }

  private extractFromDomain(req: Request): string | null {
    const host = req.get('host');
    if (!host) return null;

    // Remove port if present
    const hostname = host.split(':')[0];
    const parts = hostname.split('.');

    // Ignore known hosting/infrastructure domains — not tenant identifiers
    const ignoredApexDomains = ['onrender.com', 'render.com', 'localhost', 'railway.app', 'fly.dev', 'vercel.app', 'netlify.app'];
    const apexDomain = parts.slice(-2).join('.');
    if (ignoredApexDomains.includes(apexDomain)) return null;

    // Support for subdomain.tenant.com format
    if (parts.length >= 3) {
      const subdomain = parts[0];
      return subdomain !== 'www' && subdomain !== 'api' ? subdomain : null;
    }

    return null;
  }

  private extractFromApiKey(req: Request): string | null {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) return null;
    
    // API key format: tenantId_randomString
    const parts = apiKey.split('_');
    return parts.length >= 2 ? parts[0] : null;
  }
}