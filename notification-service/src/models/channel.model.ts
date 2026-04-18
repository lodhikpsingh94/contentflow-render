import { Schema, Document, Model, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IChannelConfig extends Document {
  _id: string;
  tenantId: string;
  type: 'email' | 'push' | 'sms';
  provider: string;
  name: string;
  configuration: ProviderConfig;
  isActive: boolean;
  isDefault: boolean;
  rateLimit?: RateLimitConfig;
  priority: number;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderConfig {
  // Email providers (SMTP, SendGrid, Mailgun, etc.)
  smtp?: SMTPConfig;
  sendgrid?: SendGridConfig;
  mailgun?: MailgunConfig;
  
  // Push providers (FCM, APNS, etc.)
  fcm?: FCMConfig;
  apns?: APNSConfig;
  
  // SMS providers (Twilio, etc.)
  twilio?: TwilioConfig;
  
  // Webhook for custom providers
  webhook?: WebhookConfig;
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface SendGridConfig {
  apiKey: string;
  from: string;
}

export interface MailgunConfig {
  apiKey: string;
  domain: string;
  from: string;
}

export interface FCMConfig {
  serviceAccount: string; // JSON service account key
  from?: string;
}

export interface APNSConfig {
  keyId: string;
  teamId: string;
  privateKey: string;
  bundleId: string;
  production: boolean;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT';
  headers: Record<string, string>;
  auth?: {
    type: 'basic' | 'bearer';
    credentials: string;
  };
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

const ChannelConfigSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  tenantId: { type: String, required: true, index: true },
  type: { 
    type: String, 
    enum: ['email', 'push', 'sms'], 
    required: true,
    index: true 
  },
  provider: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  configuration: {
    smtp: {
      host: { type: String },
      port: { type: Number },
      secure: { type: Boolean },
      auth: {
        user: { type: String },
        pass: { type: String }
      },
      from: { type: String }
    },
    sendgrid: {
      apiKey: { type: String },
      from: { type: String }
    },
    mailgun: {
      apiKey: { type: String },
      domain: { type: String },
      from: { type: String }
    },
    fcm: {
      serviceAccount: { type: String },
      from: { type: String }
    },
    apns: {
      keyId: { type: String },
      teamId: { type: String },
      privateKey: { type: String },
      bundleId: { type: String },
      production: { type: Boolean }
    },
    twilio: {
      accountSid: { type: String },
      authToken: { type: String },
      fromNumber: { type: String }
    },
    webhook: {
      url: { type: String },
      method: { type: String, enum: ['POST', 'PUT'] },
      headers: { type: Map, of: String },
      auth: {
        type: { type: String, enum: ['basic', 'bearer'] },
        credentials: { type: String }
      }
    }
  },
  isActive: { type: Boolean, default: true, index: true },
  isDefault: { type: Boolean, default: false },
  rateLimit: {
    requestsPerMinute: { type: Number, default: 60 },
    requestsPerHour: { type: Number, default: 1000 },
    requestsPerDay: { type: Number, default: 10000 }
  },
  priority: { type: Number, default: 1, min: 1, max: 10 },
  createdBy: { type: String, required: true },
  updatedBy: { type: String, required: true }
}, {
  timestamps: true,
  versionKey: false
});

ChannelConfigSchema.index({ tenantId: 1, type: 1, isActive: 1, isDefault: 1 });
ChannelConfigSchema.index({ tenantId: 1, provider: 1 }, { unique: true });

export const ChannelConfig: Model<IChannelConfig> = model<IChannelConfig>('ChannelConfig', ChannelConfigSchema);