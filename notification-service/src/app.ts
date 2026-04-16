import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { mongodbConnection } from './database/mongodb.connection';
import { redisClient } from './cache/redis.client';
import { healthRoutes } from './api/health.routes';
import { notificationRoutes } from './api/notifications.routes';
import { templateRoutes } from './api/templates.routes';
import { logger } from './utils/logger';
import { QueueService } from './services/queue.service';
import { TemplateService } from './services/template.service';
import { NotificationService } from './services/notification.service';

class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeDependencies();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeDatabase();
  }

  private initializeDependencies(): void {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    };

    const templateService = new TemplateService();
    // The queueService needs to be created before the notificationService
    const queueService = new QueueService({} as NotificationService, redisConfig);
    const notificationService = new NotificationService(queueService, templateService);
    // Now, inject the fully initialized notificationService back into the queueService
    // This resolves the circular dependency for the job processor
    queueService.setNotificationService(notificationService);

    this.app.set('templateService', templateService);
    this.app.set('queueService', queueService);
    this.app.set('notificationService', notificationService);
  }

  private initializeMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
  }

  private initializeRoutes(): void {
    this.app.use('/health', healthRoutes);
    this.app.use('/api/v1/notifications', notificationRoutes);
    this.app.use('/api/v1/templates', templateRoutes);

    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Notification Service',
      });
    });
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await mongodbConnection.connect();
      await redisClient.connect();
      logger.info('Database connections initialized');
    } catch (error) {
      logger.error('Failed to initialize database connections:', error);
      process.exit(1);
    }
  }

  public listen(): void {
    const port = process.env.PORT || 3004;
    this.app.listen(port, () => {
      logger.info(`🚀 Notification Service API started on port ${port}`); // <-- Line 80
    });
  }
}

export default App;