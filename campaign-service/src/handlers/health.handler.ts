import { Request, Response } from 'express';
import { mongodbConnection } from '../database/mongodb.connection';
import { redisClient } from '../cache/redis.client';
import { logger } from '../utils/logger';

export class HealthHandler {
  async healthCheck(req: Request, res: Response): Promise<void> {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      service: 'campaign-service',
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    res.json({
      success: true,
      data: health,
    });
  }

  async detailedHealthCheck(req: Request, res: Response): Promise<void> {
    const health: any = {
      status: 'healthy',
      timestamp: new Date(),
      service: 'campaign-service',
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      dependencies: {},
    };

    try {
      // Check MongoDB health
      const mongoHealth = await mongodbConnection.healthCheck();
      health.dependencies.mongodb = mongoHealth ? 'healthy' : 'unhealthy';
      if (!mongoHealth) health.status = 'degraded';
    } catch (error) {
      health.dependencies.mongodb = 'unhealthy';
      health.status = 'degraded';
    }

    try {
      // Check Redis health
      const redisHealth = await redisClient.healthCheck();
      health.dependencies.redis = redisHealth ? 'healthy' : 'unhealthy';
      if (!redisHealth) health.status = 'degraded';
    } catch (error) {
      health.dependencies.redis = 'unhealthy';
      health.status = 'degraded';
    }

    // Add tenant context if available
    try {
      const tenantContext = req['tenantContext'];
      if (tenantContext) {
        health.tenantContext = {
          tenantId: tenantContext.tenantId,
        };
      }
    } catch {
      // Ignore tenant context errors in health check
    }

    res.json({
      success: true,
      data: health,
    });
  }

  async readinessCheck(req: Request, res: Response): Promise<void> {
    const checks = {
      api: true,
      mongodb: await mongodbConnection.healthCheck(),
      redis: await redisClient.healthCheck(),
    };

    const isReady = Object.values(checks).every(Boolean);
    const status = isReady ? 'ready' : 'not ready';

    res.json({
      success: true,
      data: {
        status,
        timestamp: new Date(),
        checks,
      },
    });
  }

  async livenessCheck(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      data: {
        status: 'live',
        timestamp: new Date(),
        uptime: process.uptime(),
      },
    });
  }
}

export const healthHandler = new HealthHandler();