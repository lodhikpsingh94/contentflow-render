import { Notification, INotification } from '../models/notification.model';
import { Template } from '../models/template.model';
import { ChannelConfig } from '../models/channel.model';
import { EmailProviderFactory } from '../providers/email.provider';
import { PushProviderFactory } from '../providers/push.provider';
import { SMSProviderFactory } from '../providers/sms.provider';
import { QueueService } from './queue.service';
import { TemplateService } from '../services/template.service';
import { redisClient } from '../cache/redis.client';
import { logger } from '../utils/logger';
import Handlebars from 'handlebars';
import Queue from 'bull';

export class NotificationService {
  constructor(
    private queueService: QueueService,
    private templateService: TemplateService
  ) {}

  async createNotification(notificationData: Partial<INotification>): Promise<INotification> {
    const notification = new Notification(notificationData);
    await notification.save();

    // Add to queue for processing
    await this.queueService.addNotificationJob(notification);

    logger.info('Notification created and queued', {
      notificationId: notification._id,
      tenantId: notification.tenantId,
      type: notification.type
    });

    return notification;
  }

  async sendNotification(notification: INotification): Promise<boolean> {
    try {
      // Check if notification should be sent based on user preferences
      if (!this.shouldSendNotification(notification)) {
        await this.updateNotificationStatus(notification._id, 'failed', 'User preferences prevent sending');
        return false;
      }

      // Get channel configuration
      const channelConfig = await this.getChannelConfig(notification);
      if (!channelConfig) {
        await this.updateNotificationStatus(notification._id, 'failed', 'No active channel configuration found');
        return false;
      }

      // Process template if needed
      const processedContent = await this.processTemplate(notification, channelConfig);
      
      // Send notification based on type
      let result;
      switch (notification.type) {
        case 'email':
          result = await this.sendEmail(notification, processedContent, channelConfig);
          break;
        case 'push':
          result = await this.sendPush(notification, processedContent, channelConfig);
          break;
        case 'sms':
          result = await this.sendSMS(notification, processedContent, channelConfig);
          break;
        default:
          throw new Error(`Unsupported notification type: ${notification.type}`);
      }

      if (result.success) {
        await this.updateNotificationStatus(notification._id, 'sent', '', {
          messageId: result.messageId,
          providerResponse: result.providerResponse
        });
        return true;
      } else {
        await this.handleSendFailure(notification, result.error);
        return false;
      }

    } catch (error:any) {
      logger.error('Send notification error:', error);
      await this.handleSendFailure(notification, error.message);
      return false;
    }
  }
  public async processNotificationJob(job: Queue.Job): Promise<any> {
    const { notificationId, tenantId } = job.data;
    
    try {
        const notification = await this.getNotification(notificationId, tenantId);
        if (!notification) {
        throw new Error(`Notification not found: ${notificationId}`);
        }

        if (notification.status !== 'pending') {
        return { skipped: true, reason: 'Already processed' };
        }

        if (notification.scheduledAt && notification.scheduledAt > new Date()) {
        // The job was likely triggered early, the queue will handle re-scheduling with delay
        throw new Error('Scheduled for a future time.');
        }

        const success = await this.sendNotification(notification);
        return { success, notificationId };
        
    } catch (error: any) {
        logger.error('Notification job processing error:', { error: error.message, notificationId });
        throw error; // Re-throw the error to let Bull handle the job failure/retry
    }
    }

  private shouldSendNotification(notification: INotification): boolean {
    const preferences = notification.recipient.preferences;
    
    if (!preferences) return true;

    // Check if user has opted out of this notification type
    switch (notification.type) {
      case 'email':
        if (!preferences.email) return false;
        break;
      case 'push':
        if (!preferences.push) return false;
        break;
      case 'sms':
        if (!preferences.sms) return false;
        break;
    }

    // Check frequency preferences (simplified)
    if (preferences.frequency === 'daily' && this.isHighFrequency(notification)) {
      return false;
    }

    return true;
  }

  private isHighFrequency(notification: INotification): boolean {
    // Implement frequency checking logic
    // For now, return false (allow all)
    return false;
  }

  private async getChannelConfig(notification: INotification): Promise<any> {
    const cacheKey = `channel:config:${notification.tenantId}:${notification.type}`;
    
    const cachedConfig = await redisClient.getForTenant<any>(notification.tenantId, cacheKey);
    if (cachedConfig) {
      return cachedConfig;
    }

    const config = await ChannelConfig.findOne({
      tenantId: notification.tenantId,
      type: notification.type,
      isActive: true
    }).sort({ priority: -1 });

    if (config) {
      await redisClient.setForTenant(notification.tenantId, cacheKey, config, 300); // Cache for 5 minutes
    }

    return config;
  }

  private async processTemplate(notification: INotification, channelConfig: any): Promise<any> {
    if (!channelConfig.configuration.templateId) {
      return notification.content;
    }

    const template = await this.templateService.getTemplate(
      notification.tenantId,
      channelConfig.configuration.templateId
    );

    if (!template) {
      throw new Error(`Template not found: ${channelConfig.configuration.templateId}`);
    }

    return this.templateService.renderTemplate(template, notification.content.data || {});
  }

  private async sendEmail(notification: INotification, content: any, channelConfig: any): Promise<any> {
    const provider = EmailProviderFactory.createProvider(
      channelConfig.provider,
      channelConfig.configuration
    );

    const emailMessage = {
      to: notification.recipient.email!,
      subject: content.subject || notification.content.subject,
      html: content.html || notification.content.body,
      text: content.text || this.htmlToText(content.html || notification.content.body),
      from: channelConfig.configuration.from,
      replyTo: channelConfig.configuration.replyTo,
      cc: channelConfig.configuration.cc,
      bcc: channelConfig.configuration.bcc,
      attachments: channelConfig.configuration.attachments
    };

    return provider.send(emailMessage);
  }

  private async sendPush(notification: INotification, content: any, channelConfig: any): Promise<any> {
    const provider = PushProviderFactory.createProvider(
      channelConfig.provider,
      channelConfig.configuration
    );

    const pushMessage = {
      to: notification.recipient.deviceToken!,
      title: content.title || notification.content.title,
      body: content.body || notification.content.body,
      data: notification.content.data,
      imageUrl: notification.content.imageUrl,
      deepLink: notification.content.deepLink,
      badge: notification.content.data?.badge,
      sound: notification.content.data?.sound,
      priority: notification.priority === 'urgent' ? 'high' : 'normal'
    };
    return provider.send(pushMessage);
  }

  private async sendSMS(notification: INotification, content: any, channelConfig: any): Promise<any> {
    const provider = SMSProviderFactory.createProvider(
      channelConfig.provider,
      channelConfig.configuration
    );

    const smsMessage = {
      to: notification.recipient.phone!,
      body: content.body || notification.content.body,
      from: channelConfig.configuration.fromNumber,
      mediaUrl: notification.content.imageUrl
    };

    return provider.send(smsMessage);
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p\s*\/?>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  private async updateNotificationStatus(
    notificationId: string, 
    status: string, 
    failureReason?: string,
    trackingUpdates?: any
  ): Promise<void> {
    const update: any = {
      status,
      tracking: {
        lastAttemptAt: new Date(),
        deliveryAttempts: { $inc: 1 }
      }
    };

    if (status === 'sent') {
      update.sentAt = new Date();
    } else if (status === 'failed' && failureReason) {
      update.tracking.failureReason = failureReason;
    }

    if (trackingUpdates) {
      update.tracking = { ...update.tracking, ...trackingUpdates };
    }

    await Notification.findByIdAndUpdate(notificationId, update);
  }

  private async handleSendFailure(notification: INotification, error: string): Promise<void> {
    const attempts = notification.tracking.deliveryAttempts + 1;
    
    if (attempts >= 3) { // Max 3 attempts
      await this.updateNotificationStatus(notification._id, 'failed', error);
      logger.error('Notification failed after max attempts', {
        notificationId: notification._id,
        error,
        attempts
      });
    } else {
      // Retry with exponential backoff
      const backoffDelay = Math.pow(2, attempts) * 1000; // 2^attempts seconds
      await this.queueService.retryNotification(notification, backoffDelay);
      
      await this.updateNotificationStatus(notification._id, 'pending', error);
      logger.warn('Notification queued for retry', {
        notificationId: notification._id,
        error,
        attempt: attempts,
        nextAttempt: backoffDelay
      });
    }
  }

  async getNotification(notificationId: string, tenantId: string): Promise<INotification | null> {
    return Notification.findOne({ _id: notificationId, tenantId });
  }

  async getNotifications(
    tenantId: string, 
    filters: any, 
    page: number = 1, 
    limit: number = 50
  ): Promise<{ notifications: INotification[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const query: any = { tenantId };
    
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.userId) query['recipient.userId'] = filters.userId;
    if (filters.campaignId) query['metadata.campaignId'] = filters.campaignId;
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query)
    ]);

    return { notifications, total };
  }

  async trackEvent(notificationId: string, event: 'delivered' | 'read' | 'click' | 'conversion'): Promise<void> {
    const update: any = {};
    
    switch (event) {
      case 'delivered':
        update.deliveredAt = new Date();
        update.status = 'delivered';
        break;
      case 'read':
        update.readAt = new Date();
        update.status = 'read';
        update.$inc = { 'tracking.openCount': 1 };
        break;
      case 'click':
        update.$inc = { 'tracking.clickCount': 1 };
        break;
      case 'conversion':
        update.$inc = { 'tracking.conversionCount': 1 };
        break;
    }

    await Notification.findByIdAndUpdate(notificationId, update);
  }
}