import { Router } from 'express';
import { mongodbConnection } from '../database/mongodb.connection';
import { redisClient } from '../cache/redis.client';
import { logger } from '../utils/logger';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date(),
      service: 'user-segmentation-service',
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime(),
    },
  });
});

router.get('/detailed', async (req, res) => {
  const health: any = {
    status: 'healthy',
    timestamp: new Date(),
    service: 'user-segmentation-service',
    version: process.env.APP_VERSION || '1.0.0',
    uptime: process.uptime(),
    dependencies: {},
  };

  try {
    const mongoHealth = await mongodbConnection.healthCheck();
    health.dependencies.mongodb = mongoHealth ? 'healthy' : 'unhealthy';
    if (!mongoHealth) health.status = 'degraded';
  } catch (error) {
    health.dependencies.mongodb = 'unhealthy';
    health.status = 'degraded';
  }

  try {
    const redisHealth = await redisClient.healthCheck();
    health.dependencies.redis = redisHealth ? 'healthy' : 'unhealthy';
    if (!redisHealth) health.status = 'degraded';
  } catch (error) {
    health.dependencies.redis = 'unhealthy';
    health.status = 'degraded';
  }

  res.json({
    success: true,
    data: health,
  });
});

router.get('/ready', async (req, res) => {
  const checks = {
    api: true,
    mongodb: await mongodbConnection.healthCheck(),
    redis: await redisClient.healthCheck(),
  };

  const isReady = Object.values(checks).every(Boolean);

  res.json({
    success: true,
    data: {
      status: isReady ? 'ready' : 'not ready',
      timestamp: new Date(),
      checks,
    },
  });
});

router.get('/live', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'live',
      timestamp: new Date(),
      uptime: process.uptime(),
    },
  });
});

export { router as healthRoutes };