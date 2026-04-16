import { Schema, Document, Model, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IUserProfile extends Document {
  _id: string;
  tenantId: string;
  userId: string;
  demographic: DemographicData;
  behavioral: BehavioralData;
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
    accountAgeDays: { type: Number, default: 0 }
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
    lifetimeValue: { type: Number, default: 0 }
  },
  customAttributes: { type: Map, of: Schema.Types.Mixed },
  segments: [{ type: String, index: true }],
  segmentHistory: [{
    segmentId: { type: String, required: true },
    addedAt: { type: Date, required: true },
    removedAt: { type: Date },
    reason: { type: String, required: true }
  }],
  metadata: {
    isActive: { type: Boolean, default: true, index: true },
    isPremium: { type: Boolean, default: false },
    isNewUser: { type: Boolean, default: true },
    lastActivity: { type: Date, default: Date.now },
    acquisitionSource: { type: String },
    tags: [{ type: String }]
  },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true,
  versionKey: false
});

// Compound indexes for performance
UserProfileSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
UserProfileSchema.index({ tenantId: 1, segments: 1 });
UserProfileSchema.index({ tenantId: 1, 'demographic.country': 1 });
UserProfileSchema.index({ tenantId: 1, 'behavioral.engagementScore': 1 });
UserProfileSchema.index({ tenantId: 1, 'metadata.lastActivity': 1 });

export const UserProfile: Model<IUserProfile> = model<IUserProfile>('UserProfile', UserProfileSchema);