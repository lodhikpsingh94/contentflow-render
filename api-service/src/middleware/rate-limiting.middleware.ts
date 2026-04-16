import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { TenantContext } from '../models/shared/tenant.types';

interface RateLimiterMap {
  [tenantId: string]: RateLimiterMemory;
}

@Injectable()
export class RateLimitingMiddleware implements NestMiddleware {
  private limiters: RateLimiterMap = {};

async use(req: Request, res: Response, next: NextFunction) {
    const context = req.tenantContext;
    
    if (!context) {
      // Cannot rate limit if tenant is not identified
      return next();
    }

    const { tenantId, tenant } = context;
    // Ensure userIdentifier is always a string for the consume method
    const userIdentifier = (req.headers['x-user-id'] as string) || req.ip || 'unknown_ip';

    // Skip rate limiting for health checks
    if (req.path.includes('/health')) {
      return next();
    }

    // Get or create rate limiter for the tenant
    let limiter = this.limiters[tenantId];
    if (!limiter) {
      const config = tenant.config.rateLimiting;
      limiter = new RateLimiterMemory({
        // keyPrefix makes all keys for this limiter instance unique to the tenant
        keyPrefix: `rate_limit_${tenantId}`,
        points: config.requestsPerMinute,
        duration: 60, // per minute
        blockDuration: 300, // block for 5 minutes if exceeded
      });
      this.limiters[tenantId] = limiter;
    }

    try {
      // Consume a point for the specific userIdentifier (e.g., user_id or IP)
      const rateLimiterRes = await limiter.consume(userIdentifier, 1);
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', tenant.config.rateLimiting.requestsPerMinute);
      res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
      res.setHeader('X-RateLimit-Reset', Math.floor((Date.now() + rateLimiterRes.msBeforeNext) / 1000));
      
      next();
    } catch (rejRes: any) {
      const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000);
      
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Retry-After', retryAfter);
      
      res.status(429).json({
        success: false,
        error: {
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          timestamp: new Date(),
          details: {
            retryAfter,
            limit: tenant.config.rateLimiting.requestsPerMinute,
            period: 'minute'
          }
        }
      });
    }
  }

  private async getRemainingPoints(limiter: RateLimiterMemory, key: string): Promise<number> {
    try {
      const res = await limiter.get(key);
      return res?.remainingPoints || 0;
    } catch {
      return 0;
    }
  }
}