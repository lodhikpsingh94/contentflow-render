import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TenantContext } from '../models/shared/tenant.types';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const tenantContext = req.tenantContext;

    if (!tenantContext) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Tenant context required',
          code: 'MISSING_TENANT_CONTEXT',
          timestamp: new Date()
        }
      });
    }

    // Skip auth for health checks
    if (req.path === '/health' || req.path === '/health/detailed') {
      return next();
    }

    // Validate authentication
    const authHeader = req.headers['authorization'];
    const apiKey = req.headers['x-api-key'] as string;

    if (!authHeader && !apiKey) {
      this.logger.warn(`Authentication required for tenant: ${tenantContext.tenantId}`);
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required. Provide Authorization header or X-API-Key',
          code: 'AUTHENTICATION_REQUIRED',
          timestamp: new Date()
        }
      });
    }

    let isValid = false;

    if (authHeader) {
      isValid = this.validateJwtToken(authHeader, tenantContext);
    } else if (apiKey) {
      isValid = this.validateApiKey(apiKey, tenantContext);
    }

    if (!isValid) {
      this.logger.warn(`Invalid authentication for tenant: ${tenantContext.tenantId}`);
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid authentication credentials',
          code: 'INVALID_CREDENTIALS',
          timestamp: new Date()
        }
      });
    }

    this.logger.debug(`Auth validated for tenant: ${tenantContext.tenantId}`);
    next();
  }

  private validateJwtToken(token: string, context: TenantContext): boolean {
    try {
      const actualToken = token.replace('Bearer ', '');
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        this.logger.error('JWT_SECRET env var is not set');
        return false;
      }
      const decoded = jwt.verify(actualToken, secret) as any;
      return decoded &&
             decoded.tenantId === context.tenantId &&
             decoded.exp > Date.now() / 1000;
    } catch (error: any) {
      this.logger.error(`JWT validation error: ${error.message}`);
      return false;
    }
  }

  private validateApiKey(apiKey: string, context: TenantContext): boolean {
    try {
      // API key format: tenantId_<secret>
      // The key must start with the tenantId followed by an underscore
      const parts = apiKey.split('_');
      return parts.length >= 2 && parts[0] === context.tenantId;
    } catch (error: any) {
      this.logger.error(`API key validation error: ${error.message}`);
      return false;
    }
  }
}
