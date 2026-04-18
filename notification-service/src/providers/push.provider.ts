import admin from 'firebase-admin';
import apn from '@parse/node-apn';
import { logger } from '../utils/logger';
import { FCMConfig, APNSConfig } from '../models/channel.model';

export interface PushMessage {
  to: string; // device token
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  deepLink?: string;
  badge?: number;
  sound?: string;
  priority?: 'normal' | 'high';
}

export interface PushResult {
  success: boolean;
  messageId?: string;
  providerResponse?: any;
  error?: string;
}

export abstract class PushProvider {
  abstract send(message: PushMessage): Promise<PushResult>;
  abstract validateConfig(config: any): boolean;
}

export class FCMProvider extends PushProvider {
  private app: admin.app.App;

  constructor(private config: FCMConfig) {
    super();
    this.app = admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(config.serviceAccount))
    });
  }

  async send(message: PushMessage): Promise<PushResult> {
    try {
      const messaging = this.app.messaging();
      
      const payload: admin.messaging.Message = {
        token: message.to,
        notification: {
          title: message.title,
          body: message.body,
          imageUrl: message.imageUrl
        },
        data: message.data,
        android: {
          priority: message.priority === 'high' ? 'high' : 'normal'
        },
        apns: {
          payload: {
            aps: {
              badge: message.badge,
              sound: message.sound || 'default',
              'content-available': 1
            }
          }
        }
      };

      const messageId = await messaging.send(payload);
      
      return {
        success: true,
        messageId,
        providerResponse: { messageId }
      };
    } catch (error:any) {
      logger.error('FCM send error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  validateConfig(config: FCMConfig): boolean {
    try {
      const serviceAccount = JSON.parse(config.serviceAccount);
      return !!(serviceAccount.project_id && serviceAccount.private_key && serviceAccount.client_email);
    } catch {
      return false;
    }
  }
}

export class APNSProvider extends PushProvider {
  private provider: apn.Provider;

  constructor(private config: APNSConfig) {
    super();
    this.provider = new apn.Provider({
      token: {
        key: Buffer.from(config.privateKey, 'utf8'),
        keyId: config.keyId,
        teamId: config.teamId
      },
      production: config.production
    });
  }

  async send(message: PushMessage): Promise<PushResult> {
    try {
      const notification = new apn.Notification();
      
      notification.alert = {
        title: message.title,
        body: message.body
      };
      notification.badge = message.badge;
      notification.sound = message.sound || 'default';
      notification.payload = message.data;
      notification.topic = this.config.bundleId;
      
      if (message.deepLink) {
        notification.payload = { ...notification.payload, deepLink: message.deepLink };
      }

      const result = await this.provider.send(notification, message.to);
      
      if (result.failed.length > 0) {
        return {
          success: false,
          error: result.failed[0].response?.reason || 'APNS delivery failed'
        };
      }

      return {
        success: true,
        messageId: result.sent[0]?.device,
        providerResponse: result
      };
    } catch (error:any) {
      logger.error('APNS send error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  validateConfig(config: APNSConfig): boolean {
    return !!(config.keyId && config.teamId && config.privateKey && config.bundleId);
  }
}

export class PushProviderFactory {
  static createProvider(type: string, config: any): PushProvider {
    switch (type) {
      case 'fcm':
        return new FCMProvider(config);
      case 'apns':
        return new APNSProvider(config);
      default:
        throw new Error(`Unsupported push provider: ${type}`);
    }
  }
}