import { Schema, Document, Model, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface INotification extends Document {
  _id: string;
  tenantId: string;
  type: 'email' | 'push' | 'sms' | 'in_app';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  channel: NotificationChannel;
  recipient: Recipient;
  content: NotificationContent;
  tracking: TrackingData;
  metadata: NotificationMetadata;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationChannel {
  provider: string;
  providerId?: string;
  configuration: ChannelConfig;
}

export interface ChannelConfig {
  templateId?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Attachment[];
}

export interface Attachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface Recipient {
  userId: string;
  email?: string;
  phone?: string;
  deviceToken?: string;
  segments?: string[];
  preferences?: UserPreferences;
}

export interface UserPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  frequency: 'realtime' | 'daily' | 'weekly';
  timezone: string;
  language: string;
}

export interface NotificationContent {
  subject: string;
  title: string;
  body: string;
  html?: string;
  data?: Record<string, any>;
  actions?: Action[];
  imageUrl?: string;
  deepLink?: string;
}

export interface Action {
  type: 'button' | 'link';
  text: string;
  url: string;
  actionId: string;
}

export interface TrackingData {
  messageId?: string;
  providerResponse?: any;
  deliveryAttempts: number;
  lastAttemptAt?: Date;
  failureReason?: string;
  clickCount: number;
  openCount: number;
  conversionCount: number;
}

export interface NotificationMetadata {
  campaignId?: string;
  contentId?: string;
  trigger: 'system' | 'user' | 'campaign' | 'api';
  category: string;
  tags: string[];
  userAgent?: string;
  ipAddress?: string;
}

const NotificationSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  tenantId: { type: String, required: true, index: true },
  type: { 
    type: String, 
    enum: ['email', 'push', 'sms', 'in_app'], 
    required: true,
    index: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'sent', 'delivered', 'failed', 'read'], 
    default: 'pending',
    index: true 
  },
  priority: { 
    type: String, 
    enum: ['low', 'normal', 'high', 'urgent'], 
    default: 'normal',
    index: true 
  },
  channel: {
    provider: { type: String, required: true },
    providerId: { type: String },
    configuration: {
      templateId: { type: String },
      from: { type: String },
      replyTo: { type: String },
      cc: [{ type: String }],
      bcc: [{ type: String }],
      attachments: [{
        filename: { type: String, required: true },
        content: { type: Buffer },
        contentType: { type: String, required: true }
      }]
    }
  },
  recipient: {
    userId: { type: String, required: true, index: true },
    email: { type: String, index: true },
    phone: { type: String, index: true },
    deviceToken: { type: String, index: true },
    segments: [{ type: String }],
    preferences: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      frequency: { 
        type: String, 
        enum: ['realtime', 'daily', 'weekly'], 
        default: 'realtime' 
      },
      timezone: { type: String, default: 'UTC' },
      language: { type: String, default: 'en' }
    }
  },
  content: {
    subject: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    html: { type: String },
    data: { type: Map, of: Schema.Types.Mixed },
    actions: [{
      type: { type: String, enum: ['button', 'link'], required: true },
      text: { type: String, required: true },
      url: { type: String, required: true },
      actionId: { type: String, required: true }
    }],
    imageUrl: { type: String },
    deepLink: { type: String }
  },
  tracking: {
    messageId: { type: String },
    providerResponse: { type: Schema.Types.Mixed },
    deliveryAttempts: { type: Number, default: 0 },
    lastAttemptAt: { type: Date },
    failureReason: { type: String },
    clickCount: { type: Number, default: 0 },
    openCount: { type: Number, default: 0 },
    conversionCount: { type: Number, default: 0 }
  },
  metadata: {
    campaignId: { type: String, index: true },
    contentId: { type: String, index: true },
    trigger: { 
      type: String, 
      enum: ['system', 'user', 'campaign', 'api'], 
      required: true 
    },
    category: { type: String, required: true, index: true },
    tags: [{ type: String }],
    userAgent: { type: String },
    ipAddress: { type: String }
  },
  scheduledAt: { type: Date, index: true },
  sentAt: { type: Date },
  deliveredAt: { type: Date },
  readAt: { type: Date }
}, {
  timestamps: true,
  versionKey: false
});

// Compound indexes for performance
NotificationSchema.index({ tenantId: 1, status: 1, scheduledAt: 1 });
NotificationSchema.index({ tenantId: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ tenantId: 1, 'recipient.userId': 1, createdAt: -1 });
NotificationSchema.index({ tenantId: 1, 'metadata.campaignId': 1 });

export const Notification: Model<INotification> = model<INotification>('Notification', NotificationSchema);