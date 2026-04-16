import { Worker } from 'bull';
import { NotificationService } from '../services/notification.service';
import { logger } from '../utils/logger';

export class SMSWorker {
  private worker: Worker;

  constructor(
    private notificationService: NotificationService,
    redisConfig: any
  ) {
    this.worker = new Worker('sms processing', async (job) => {
      return await this.processSMSJob(job);
    }, {
      redis: redisConfig,
      concurrency: 3 // Lower concurrency for SMS due to rate limits
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      logger.info('SMS job completed', {
        jobId: job.id,
        notificationId: job.data.notificationId
      });
    });

    this.worker.on('failed', (job, error) => {
      logger.error('SMS job failed', {
        jobId: job.id,
        notificationId: job.data.notificationId,
        error: error.message
      });
    });

    this.worker.on('error', (error) => {
      logger.error('SMS worker error:', error);
    });
  }

  private async processSMSJob(job: any): Promise<any> {
    const { notificationId, tenantId } = job.data;
    
    try {
      const notification = await this.notificationService.getNotification(notificationId, tenantId);
      if (!notification) {
        throw new Error(`SMS notification not found: ${notificationId}`);
      }

      // SMS-specific processing
      // For example: message length validation, character encoding
      if (!notification.recipient.phone) {
        throw new Error('No phone number provided for SMS notification');
      }

      // Validate SMS length
      if (notification.content.body.length > 160) {
        logger.warn('SMS message exceeds 160 characters', {
          notificationId,
          length: notification.content.body.length
        });
      }

      const success = await this.notificationService.sendNotification(notification);
      return { success, notificationId, channel: 'sms' };
      
    } catch (error) {
      logger.error('SMS job processing error:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}