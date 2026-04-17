import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { mongodbConnection } from './database/mongodb.connection';
import { redisClient } from './cache/redis.client';
import { apiRoutes } from './routes';
import { errorHandler, notFoundHandler } from './middleware/validation';
import { requestLogger, errorLogger } from './middleware/logging';
import { logger } from './utils/logger';
import { getConfig } from './config';

class App {
  public app: express.Application;
  private config = getConfig();

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeDatabase();
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
    // Bare /health for Render health checks (no auth, no prefix)
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'campaign-service', timestamp: new Date() });
    });

    // API routes with version prefix
    this.app.use('/api/v1', apiRoutes);

    // Root handler
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Campaign Service',
        version: this.config.app.version,
        environment: this.config.app.environment,
        timestamp: new Date(),
      });
    });
  }

  private initializeErrorHandling(): void {
    // Error logging
    this.app.use(errorLogger);

    // Error handling
    this.app.use(errorHandler);

    // 404 handler
    this.app.use(notFoundHandler);
  }

  private async initializeDatabase(): Promise<void> {
    // MongoDB is required — exit if it fails
    try {
      await mongodbConnection.connect();
    } catch (error) {
      logger.error('Failed to connect to MongoDB (required):', error);
      process.exit(1);
    }

    // Redis is optional — log a warning but keep the service running.
    // Upstash closes idle connections; the client will reconnect automatically.
    try {
      await redisClient.connect();
    } catch (error) {
      logger.warn('Redis initial connection failed — service will retry automatically:', error);
    }
  }

  public async start(): Promise<void> {
    const port = this.config.app.port;

    try {
      this.app.listen(port, () => {
        logger.info(`🚀 Campaign Service started on port ${port}`);
        logger.info(`🌍 Environment: ${this.config.app.environment}`);
        logger.info(`📊 Log level: ${process.env.LOG_LEVEL || 'info'}`);
        logger.info(`🗄️  MongoDB: ${this.config.database.mongodb.uri}`);
        logger.info(`🔴 Redis: ${this.config.cache.redis.url ? this.config.cache.redis.url.replace(/:\/\/.*@/, '://***@') : `${this.config.cache.redis.host}:${this.config.cache.redis.port}`}`);
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
      logger.info('Campaign Service stopped gracefully');
    } catch (error) {
      logger.error('Error stopping service:', error);
    }
  }
}

export default App;