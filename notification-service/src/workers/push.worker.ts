import { Worker } from 'bull';
import { NotificationService } from '../services/notification.service';
import { logger } from '../utils/logger';

export class PushWorker {
  private worker: Worker;

  constructor(
    private notificationService: NotificationService,
    redisConfig: any
  ) {
    this.worker = new Worker('push processing', async (job) => {
      return await this.processPushJob(job);
    }, {
      redis: redisConfig,
      concurrency: 10 // Process 10 push notifications concurrently
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      logger.info('Push job completed', {
        jobId: job.id,
        notificationId: job.data.notificationId
      });
    });

    this.worker.on('failed', (job, error) => {
      logger.error('Push job failed', {
        jobId: job.id,
        notificationId: job.data.notificationId,
        error: error.message
      });
    });

    this.worker.on('error', (error) => {
      logger.error('Push worker error:', error);
    });
  }

  private async processPushJob(job: any): Promise<any> {
    const { notificationId, tenantId } = job.data;
    
    try {
      const notification = await this.notificationService.getNotification(notificationId, tenantId);
      if (!notification) {
        throw new Error(`Push notification not found: ${notificationId}`);
      }

      // Push-specific processing
      // For example: device token validation, payload optimization
      if (!notification.recipient.deviceToken) {
        throw new Error('No device token provided for push notification');
      }

      const success = await this.notificationService.sendNotification(notification);
      return { success, notificationId, channel: 'push' };
      
    } catch (error) {
      logger.error('Push job processing error:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}