import 'dotenv/config';
import { NotificationService } from '../services/notification.service';
import { TemplateService } from '../services/template.service';
import { QueueService } from '../services/queue.service';
import { EmailWorker } from './email.worker';
import { PushWorker } from './push.worker';
import { SMSWorker } from './sms.worker';
import { mongodbConnection } from '../database/mongodb.connection';
import { redisClient } from '../cache/redis.client';
import { logger } from '../utils/logger';

class NotificationWorker {
  private queueService: QueueService;
  private notificationService: NotificationService;
  private templateService: TemplateService;
  private emailWorker: EmailWorker;
  private pushWorker: PushWorker;
  private smsWorker: SMSWorker;

  constructor() {
    this.templateService = new TemplateService();
    this.notificationService = new NotificationService(
      {} as QueueService, // Will be set after queue service initialization
      this.templateService
    );
    
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD
    };

    this.queueService = new QueueService(this.notificationService, redisConfig);
    
    // Update notification service with queue service
    (this.notificationService as any).queueService = this.queueService;

    this.emailWorker = new EmailWorker(this.notificationService, this.templateService, redisConfig);
    this.pushWorker = new PushWorker(this.notificationService, redisConfig);
    this.smsWorker = new SMSWorker(this.notificationService, redisConfig);
  }

  async start(): Promise<void> {
    try {
      // Initialize database connections
      await mongodbConnection.connect();
      await redisClient.connect();

      logger.info('Notification workers started successfully');
      logger.info('📧 Email worker: Ready (concurrency: 5)');
      logger.info('📱 Push worker: Ready (concurrency: 10)');
      logger.info('💬 SMS worker: Ready (concurrency: 3)');

      // Keep the worker running
      process.on('SIGINT', this.gracefulShutdown.bind(this));
      process.on('SIGTERM', this.gracefulShutdown.bind(this));

    } catch (error) {
      logger.error('Failed to start notification workers:', error);
      process.exit(1);
    }
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info('Shutting down notification workers gracefully...');
    
    try {
      await this.emailWorker.close();
      await this.pushWorker.close();
      await this.smsWorker.close();
      await this.queueService.close();
      await mongodbConnection.disconnect();
      await redisClient.disconnect();
      
      logger.info('Notification workers stopped gracefully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the worker if this file is executed directly
if (require.main === module) {
  const worker = new NotificationWorker();
  worker.start().catch(error => {
    logger.error('Worker startup failed:', error);
    process.exit(1);
  });
}

export { NotificationWorker };