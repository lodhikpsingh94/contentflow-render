import Queue from 'bull';
import { INotification } from '../models/notification.model';
import { NotificationService } from './notification.service';
import { logger } from '../utils/logger';

export class QueueService {
  private notificationQueue: Queue.Queue;
  private retryQueue: Queue.Queue;
  private scheduledQueue: Queue.Queue;

  constructor(
    private notificationService: NotificationService,
    redisConfig: any
  ) {
    // Main notification processing queue
    this.notificationQueue = new Queue('notification processing', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 100, // Keep only 100 completed jobs
        removeOnFail: 1000, // Keep 1000 failed jobs for analysis
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000 // 1s, 2s, 4s
        }
      }
    });

    // Retry queue for failed notifications
    this.retryQueue = new Queue('notification retry', {
      redis: redisConfig,
      defaultJobOptions: {
        delay: 5000, // Default 5 second delay for retries
        removeOnComplete: 50,
        removeOnFail: 500
      }
    });

    // Scheduled notifications queue
    this.scheduledQueue = new Queue('scheduled notifications', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 500
      }
    });

    this.setupEventHandlers();
    this.setupProcessors();
  }

    // --- THIS METHOD IS NOW CORRECTLY INSIDE THE CLASS ---
  public setNotificationService(service: NotificationService) {
    this.notificationService = service;
  }

  private setupEventHandlers(): void {
    // Notification queue events
    this.notificationQueue.on('completed', (job) => {
      logger.info('Notification job completed', {
        jobId: job.id,
        notificationId: job.data.notificationId
      });
    });

    this.notificationQueue.on('failed', (job, error) => {
      logger.error('Notification job failed', {
        jobId: job.id,
        notificationId: job.data.notificationId,
        error: error.message,
        attempt: job.attemptsMade
      });
    });

    this.notificationQueue.on('stalled', (job) => {
      logger.warn('Notification job stalled', {
        jobId: job.id,
        notificationId: job.data.notificationId
      });
    });

    // Queue-level events
    this.notificationQueue.on('error', (error) => {
      logger.error('Notification queue error:', error);
    });

    this.notificationQueue.on('waiting', (jobId) => {
      logger.debug('Notification job waiting', { jobId });
    });

    this.notificationQueue.on('active', (job) => {
      logger.debug('Notification job active', {
        jobId: job.id,
        notificationId: job.data.notificationId
      });
    });
  }

  private setupProcessors(): void {
    // Process notification jobs
    this.notificationQueue.process('process-notification', 10, async (job) => {
      return await this.processNotificationJob(job);
    });

    // Process retry jobs
    this.retryQueue.process('retry-notification', 5, async (job) => {
      return await this.processRetryJob(job);
    });

    // Process scheduled notifications
    this.scheduledQueue.process('scheduled-notification', 3, async (job) => {
      return await this.processScheduledJob(job);
    });
  }

  private async processNotificationJob(job: Queue.Job): Promise<any> {
    const { notificationId, tenantId } = job.data;
    
    try {
      const notification = await this.notificationService.getNotification(notificationId, tenantId);
      if (!notification) {
        throw new Error(`Notification not found: ${notificationId}`);
      }

      // Check if notification is already processed
      if (notification.status !== 'pending') {
        return { skipped: true, reason: 'Already processed' };
      }

      // Check if notification should be sent now or scheduled
      if (notification.scheduledAt && notification.scheduledAt > new Date()) {
        await this.scheduleNotification(notification);
        return { scheduled: true, scheduledAt: notification.scheduledAt };
      }

      const success = await this.notificationService.sendNotification(notification);
      return { success, notificationId };
      
    } catch (error) {
      logger.error('Notification job processing error:', error);
      throw error;
    }
  }

  private async processRetryJob(job: Queue.Job): Promise<any> {
    const { notificationId, tenantId } = job.data;
    
    try {
      const notification = await this.notificationService.getNotification(notificationId, tenantId);
      if (!notification) {
        throw new Error(`Notification not found for retry: ${notificationId}`);
      }

      const success = await this.notificationService.sendNotification(notification);
      return { success, notificationId, retry: true };
      
    } catch (error) {
      logger.error('Retry job processing error:', error);
      throw error;
    }
  }

  private async processScheduledJob(job: Queue.Job): Promise<any> {
    const { notificationId, tenantId } = job.data;
    
    try {
      const notification = await this.notificationService.getNotification(notificationId, tenantId);
      if (!notification) {
        throw new Error(`Scheduled notification not found: ${notificationId}`);
      }

      // Double-check scheduling time
      if (notification.scheduledAt && notification.scheduledAt > new Date()) {
        // Reschedule if needed
        const delay = notification.scheduledAt.getTime() - Date.now();
        if (delay > 0) {
          await this.scheduleNotification(notification);
          return { rescheduled: true, scheduledAt: notification.scheduledAt };
        }
      }

      const success = await this.notificationService.sendNotification(notification);
      return { success, notificationId, scheduled: true };
      
    } catch (error) {
      logger.error('Scheduled job processing error:', error);
      throw error;
    }
  }

  async addNotificationJob(notification: INotification): Promise<Queue.Job> {
    const jobData = {
      notificationId: notification._id,
      tenantId: notification.tenantId,
      type: notification.type,
      priority: notification.priority,
      scheduledAt: notification.scheduledAt
    };

    const options: Queue.JobOptions = {
      jobId: `notification_${notification._id}`,
      priority: this.getQueuePriority(notification.priority),
      delay: this.getJobDelay(notification.scheduledAt)
    };

    return await this.notificationQueue.add('process-notification', jobData, options);
  }

  async retryNotification(notification: INotification, delay: number = 5000): Promise<Queue.Job> {
    const jobData = {
      notificationId: notification._id,
      tenantId: notification.tenantId,
      type: notification.type,
      attempt: notification.tracking.deliveryAttempts + 1
    };

    const options: Queue.JobOptions = {
      delay,
      priority: this.getQueuePriority(notification.priority),
      attempts: 1 // Retry jobs only attempt once
    };

    return await this.retryQueue.add('retry-notification', jobData, options);
  }

  async scheduleNotification(notification: INotification): Promise<Queue.Job> {
    if (!notification.scheduledAt) {
      throw new Error('Notification must have scheduledAt time');
    }

    const delay = notification.scheduledAt.getTime() - Date.now();
    if (delay <= 0) {
      return await this.addNotificationJob(notification);
    }

    const jobData = {
      notificationId: notification._id,
      tenantId: notification.tenantId,
      type: notification.type,
      scheduledAt: notification.scheduledAt
    };

    const options: Queue.JobOptions = {
      delay,
      jobId: `scheduled_${notification._id}`,
      priority: this.getQueuePriority(notification.priority)
    };

    return await this.scheduledQueue.add('scheduled-notification', jobData, options);
  }

  private getQueuePriority(priority: string): number {
    switch (priority) {
      case 'urgent': return 1;
      case 'high': return 2;
      case 'normal': return 3;
      case 'low': return 4;
      default: return 3;
    }
  }

  private getJobDelay(scheduledAt?: Date): number {
    if (!scheduledAt) return 0;
    
    const delay = scheduledAt.getTime() - Date.now();
    return delay > 0 ? delay : 0;
  }

  async getQueueStats(): Promise<any> {
    const [notificationStats, retryStats, scheduledStats] = await Promise.all([
      this.notificationQueue.getJobCounts(),
      this.retryQueue.getJobCounts(),
      this.scheduledQueue.getJobCounts()
    ]);

    return {
      notificationQueue: notificationStats,
      retryQueue: retryStats,
      scheduledQueue: scheduledStats
    };
  }

  async cleanOldJobs(): Promise<void> {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    await Promise.all([
      this.notificationQueue.clean(oneWeekAgo, 'completed'),
      this.notificationQueue.clean(oneWeekAgo, 'failed'),
      this.retryQueue.clean(oneWeekAgo, 'completed'),
      this.retryQueue.clean(oneWeekAgo, 'failed'),
      this.scheduledQueue.clean(oneWeekAgo, 'completed'),
      this.scheduledQueue.clean(oneWeekAgo, 'failed')
    ]);

    logger.info('Old queue jobs cleaned up');
  }

  async pause(): Promise<void> {
    await Promise.all([
      this.notificationQueue.pause(),
      this.retryQueue.pause(),
      this.scheduledQueue.pause()
    ]);
  }

  async resume(): Promise<void> {
    await Promise.all([
      this.notificationQueue.resume(),
      this.retryQueue.resume(),
      this.scheduledQueue.resume()
    ]);
  }

  async close(): Promise<void> {
    await Promise.all([
      this.notificationQueue.close(),
      this.retryQueue.close(),
      this.scheduledQueue.close()
    ]);
  }
}

