import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { createServer } from 'http';
import { mongodbConnection } from './database/mongodb.connection';
import { redisClient } from './cache/redis.client';
import { realTimeService } from './services/real-time.service';
import { segmentRoutes } from './api/segments.routes';
import { userRoutes } from './api/users.routes';
import { analyticsRoutes } from './api/analytics.routes';
import { healthRoutes } from './api/health.routes';
import { enrichmentRoutes } from './api/enrichment.routes';
import { errorHandler, notFoundHandler } from './middleware/validation';
import { requestLogger, errorLogger } from './middleware/logging';
import { logger } from './utils/logger';

class App {
  public app: express.Application;
  public server: any;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeDatabase();
    this.initializeRealTime();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
          scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Tenant-Id', 
        'X-User-Id', 
        'X-API-Key',
        'X-Request-ID'
      ],
      credentials: true,
      maxAge: 86400,
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use(requestLogger);
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/v1/segments', segmentRoutes);
    this.app.use('/api/v1/users', userRoutes);
    this.app.use('/api/v1/analytics', analyticsRoutes);
    this.app.use('/api/v1/enrichment', enrichmentRoutes);
    this.app.use('/health', healthRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'User Segmentation Service',
        version: process.env.APP_VERSION || '1.0.0',
        timestamp: new Date(),
      });
    });

    // 404 handler
    this.app.use(notFoundHandler);
  }

  private initializeErrorHandling(): void {
    // Error logging
    this.app.use(errorLogger);

    // Error handling
    this.app.use(errorHandler);
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await mongodbConnection.connect();
    } catch (error) {
      logger.error('Failed to connect to MongoDB (required):', error);
      process.exit(1);
    }

    try {
      await redisClient.connect();
      logger.info('Database connections initialized');
    } catch (error) {
      logger.warn('Redis initial connection failed — service will retry automatically:', error);
    }
  }

  private initializeRealTime(): void {
    realTimeService.initialize(this.server);
  }

  public async start(): Promise<void> {
    const port = process.env.PORT || 3002;

    try {
      this.server.listen(port, () => {
        logger.info(`🚀 User Segmentation Service started on port ${port}`);
        logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`📊 Log level: ${process.env.LOG_LEVEL || 'info'}`);
        logger.info(`🗄️  MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017'}`);
        logger.info(`🔴 Redis: ${process.env.REDIS_URL ? process.env.REDIS_URL.replace(/:\/\/.*@/, '://***@') : `${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`}`);
        logger.info(`🔌 WebSocket server running on /ws`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    try {
      await mongodbConnection.disconnect();
      await redisClient.disconnect();
      realTimeService.stop();
      logger.info('User Segmentation Service stopped gracefully');
    } catch (error) {
      logger.error('Error stopping service:', error);
    }
  }
}

export default App;