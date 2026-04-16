import twilio from 'twilio';
import { logger } from '../utils/logger';
import { TwilioConfig } from '../models/channel.model';

export interface SMSMessage {
  to: string;
  body: string;
  from?: string;
  mediaUrl?: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  providerResponse?: any;
  error?: string;
}

export abstract class SMSProvider {
  abstract send(message: SMSMessage): Promise<SMSResult>;
  abstract validateConfig(config: any): boolean;
}

export class TwilioProvider extends SMSProvider {
  private client: twilio.Twilio;

  constructor(private config: TwilioConfig) {
    super();
    this.client = twilio(config.accountSid, config.authToken);
  }

  async send(message: SMSMessage): Promise<SMSResult> {
    try {
      const twilioMessage = await this.client.messages.create({
        body: message.body,
        to: message.to,
        from: message.from || this.config.fromNumber,
        mediaUrl: message.mediaUrl ? [message.mediaUrl] : undefined
      });

      return {
        success: true,
        messageId: twilioMessage.sid,
        providerResponse: twilioMessage
      };
    } catch (error:any) {
      logger.error('Twilio send error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  validateConfig(config: TwilioConfig): boolean {
    return !!(config.accountSid && config.authToken && config.fromNumber);
  }
}

export class SMSProviderFactory {
  static createProvider(type: string, config: any): SMSProvider {
    switch (type) {
      case 'twilio':
        return new TwilioProvider(config);
      default:
        throw new Error(`Unsupported SMS provider: ${type}`);
    }
  }
}