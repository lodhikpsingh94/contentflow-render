import { Schema, Document, Model, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IUserProfile extends Document {
  _id: string;
  tenantId: string;
  userId: string;
  demographic: DemographicData;
  device: DeviceData;
  behavioral: BehavioralData;
  consent: ConsentData;
  customAttributes: Record<string, any>;
  segments: string[];
  segmentHistory: SegmentHistory[];
  metadata: UserMetadata;
  lastUpdated: Date;
  createdAt: Date;
}

export interface DemographicData {
  age?: number;
  gender?: string;
  country: string;
  city?: string;
  region?: string;
  language: string;
  timezone: string;
  subscriptionTier?: string;
  accountAgeDays: number;
  // Saudi Arabia market additions
  nationality?: string;         // ISO 3166-1 alpha-2: 'SA', 'EG', 'PK', 'IN', 'PH' …
  preferredLanguage?: 'ar' | 'en' | string;
  coordinates?: {               // for geo_radius segment rules
    lat: number;
    lng: number;
  };
}

export interface DeviceData {
  platform?: 'ios' | 'android' | 'web' | 'other';
  osVersion?: string;           // "17.4", "14"
  appVersion?: string;          // "2.1.0"
  model?: string;               // "iPhone 15 Pro", "Samsung Galaxy S24"
  networkOperator?: string;     // "stc" | "mobily" | "zain"
  connectionType?: string;      // "wifi" | "4g" | "5g" | "3g"
  advertisingId?: string;       // IDFA / GAID (consent-gated)
  lastSeenAt?: Date;
}

export interface ConsentData {
  marketing: boolean;           // General marketing consent
  push: boolean;                // Push notification consent
  sms: boolean;                 // SMS consent
  whatsapp: boolean;            // WhatsApp messaging consent
  email: boolean;               // Email marketing consent
  locationTracking: boolean;    // GPS / geo consent
  consentDate?: Date;
  consentVersion?: string;      // "v1.2" — links to published policy version
  pdplOptOut: boolean;          // Saudi PDPL right-to-erasure requested
  lastUpdated?: Date;
}

export interface BehavioralData {
  totalSessions: number;
  lastSession: Date;
  sessionDuration: number;
  pagesViewed: number;
  purchaseCount: number;
  totalSpent: number;
  averageOrderValue: number;
  lastPurchaseDate?: Date;
  favoriteCategories: string[];
  engagementScore: number;
  churnRisk: number;
  lifetimeValue: number;
  // Saudi Arabia behavioral signals
  prayerTimeSensitive?: boolean;     // derived: user consistently inactive during prayer windows
  ramadanEngagementBoost?: number;   // multiplier from past Ramadan cycles (e.g. 1.8)
  hajjUmrahInterest?: boolean;       // inferred from content interactions
}

export interface SegmentHistory {
  segmentId: string;
  addedAt: Date;
  removedAt?: Date;
  reason: string;
}

export interface UserMetadata {
  isActive: boolean;
  isPremium: boolean;
  isNewUser: boolean;
  lastActivity: Date;
  acquisitionSource: string;
  tags: string[];
}

const UserProfileSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  demographic: {
    age: { type: Number, min: 0, max: 120 },
    gender: { type: String },
    country: { type: String, required: true },
    city: { type: String },
    region: { type: String },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
    subscriptionTier: { type: String },
    accountAgeDays: { type: Number, default: 0 },
    nationality: { type: String, index: true },
    preferredLanguage: { type: String, default: 'en' },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  device: {
    platform: { type: String, enum: ['ios', 'android', 'web', 'other'], index: true },
    osVersion: { type: String },
    appVersion: { type: String },
    model: { type: String },
    networkOperator: { type: String },
    connectionType: { type: String },
    advertisingId: { type: String },
    lastSeenAt: { type: Date },
  },
  behavioral: {
    totalSessions: { type: Number, default: 0 },
    lastSession: { type: Date },
    sessionDuration: { type: Number, default: 0 },
    pagesViewed: { type: Number, default: 0 },
    purchaseCount: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    lastPurchaseDate: { type: Date },
    favoriteCategories: [{ type: String }],
    engagementScore: { type: Number, default: 0, min: 0, max: 100 },
    churnRisk: { type: Number, default: 0, min: 0, max: 100 },
    lifetimeValue: { type: Number, default: 0 },
    prayerTimeSensitive: { type: Boolean, default: false },
    ramadanEngagementBoost: { type: Number, default: 1.0 },
    hajjUmrahInterest: { type: Boolean, default: false },
  },
  consent: {
    marketing: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    email: { type: Boolean, default: false },
    locationTracking: { type: Boolean, default: false },
    consentDate: { type: Date },
    consentVersion: { type: String },
    pdplOptOut: { type: Boolean, default: false },
    lastUpdated: { type: Date, default: Date.now },
  },
  customAttributes: { type: Map, of: Schema.Types.Mixed },
  segments: [{ type: String, index: true }],
  segmentHistory: [{
    segmentId: { type: String, required: true },
    addedAt: { type: Date, required: true },
    removedAt: { type: Date },
    reason: { type: String, required: true },
  }],
  metadata: {
    isActive: { type: Boolean, default: true, index: true },
    isPremium: { type: Boolean, default: false },
    isNewUser: { type: Boolean, default: true },
    lastActivity: { type: Date, default: Date.now },
    acquisitionSource: { type: String },
    tags: [{ type: String }],
  },
  lastUpdated: { type: Date, default: Date.now },
}, {
  timestamps: true,
  versionKey: false,
});

// Compound indexes
UserProfileSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
UserProfileSchema.index({ tenantId: 1, segments: 1 });
UserProfileSchema.index({ tenantId: 1, 'demographic.country': 1 });
UserProfileSchema.index({ tenantId: 1, 'demographic.nationality': 1 });
UserProfileSchema.index({ tenantId: 1, 'device.platform': 1 });
UserProfileSchema.index({ tenantId: 1, 'consent.marketing': 1 });
UserProfileSchema.index({ tenantId: 1, 'behavioral.engagementScore': 1 });
UserProfileSchema.index({ tenantId: 1, 'metadata.lastActivity': 1 });

export const UserProfile: Model<IUserProfile> = model<IUserProfile>('UserProfile', UserProfileSchema);
