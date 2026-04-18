import { Worker } from 'bull';
import { NotificationService } from '../services/notification.service';
import { TemplateService } from '../services/template.service';
import { logger } from '../utils/logger';

export class EmailWorker {
  private worker: Worker;

  constructor(
    private notificationService: NotificationService,
    private templateService: TemplateService,
    redisConfig: any
  ) {
    this.worker = new Worker('email processing', async (job) => {
      return await this.processEmailJob(job);
    }, {
      redis: redisConfig,
      concurrency: 5 // Process 5 emails concurrently
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      logger.info('Email job completed', {
        jobId: job.id,
        notificationId: job.data.notificationId
      });
    });

    this.worker.on('failed', (job, error) => {
      logger.error('Email job failed', {
        jobId: job.id,
        notificationId: job.data.notificationId,
        error: error.message
      });
    });

    this.worker.on('error', (error) => {
      logger.error('Email worker error:', error);
    });
  }

  private async processEmailJob(job: any): Promise<any> {
    const { notificationId, tenantId } = job.data;
    
    try {
      // This would contain email-specific processing logic
      // For now, delegate to the main notification service
      const notification = await this.notificationService.getNotification(notificationId, tenantId);
      if (!notification) {
        throw new Error(`Email notification not found: ${notificationId}`);
      }

      // Email-specific processing can be added here
      // For example: image optimization, link tracking, etc.

      const success = await this.notificationService.sendNotification(notification);
      return { success, notificationId, channel: 'email' };
      
    } catch (error) {
      logger.error('Email job processing error:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}