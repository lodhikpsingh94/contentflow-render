import { Schema, Document, Model, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ICampaign extends Document {
  _id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed' | 'draft'|'scheduled';
  type: 'banner' | 'video' | 'popup' | 'notification';
  subType: 'image' | 'video' | 'gif' | 'custom';
  rules: CampaignRules;
  contentIds: string[];
  priority: number;
  budget?: CampaignBudget;
  statistics: CampaignStatistics;
  metadata?: Record<string, any>; // <-- ADD THIS LINE
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignRules {
  segments: string[];
  schedule: Schedule;
  frequencyCapping: FrequencyCapping;
  targeting: TargetingRules;
  constraints: CampaignConstraints;
}

export interface Schedule {
  startTime: Date;
  endTime: Date;
  timezone: string;
  recurrence?: RecurrencePattern;
}

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly';
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  interval: number;
}

export interface FrequencyCapping {
  maxImpressions: number;
  period: 'hour' | 'day' | 'week';
  perUser: boolean;
  maxClicks?: number;
}

export interface TargetingRules {
  geo: GeoTargeting;
  devices: DeviceTargeting;
  userAttributes: UserAttributeTargeting;
  behavior: BehaviorTargeting;
  customRules?: CustomRule[];
}

export interface GeoTargeting {
  countries: string[];
  regions?: string[];
  cities?: string[];
  radius?: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface DeviceTargeting {
  platforms: string[];
  osVersions: string[];
  appVersions: string[];
  deviceModels?: string[];
  connectionTypes?: string[];
}

export interface UserAttributeTargeting {
  segments: string[];
  customAttributes: Record<string, any>;
  ageRange?: { min: number; max: number };
  genders?: string[];
  languages?: string[];
  subscriptionTiers?: string[];
}

export interface BehaviorTargeting {
  minSessions?: number;
  hasPurchased?: boolean;
  lastActiveWithinDays?: number;
  favoriteCategories?: string[];
  engagementScore?: { min: number; max: number };
}

export interface CustomRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface CampaignConstraints {
  dailyBudget?: number;
  totalBudget?: number;
  maxImpressions?: number;
  maxClicks?: number;
  maxConversions?: number;
}

export interface CampaignBudget {
  total: number;
  spent: number;
  dailyLimit: number;
  type: 'cpc' | 'cpm' | 'cpa';
  currency: string;
}

export interface CampaignStatistics {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpc: number;
  lastUpdated: Date;
}

const CampaignSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  status: { 
    type: String, 
    enum: [ 'active', 'paused', 'completed', 'draft','scheduled','expired'], 
    default: '  ',  
    index: true 
  },
  type: { 
    type: String, 
    enum: ['banner', 'video', 'popup', 'notification'], 
    required: true 
  },
  // --- THIS IS THE FIX ---
  // Add the subType field to the Mongoose schema definition
  subType: { 
    type: String, 
    enum: ['image' , 'video' ,'gif' ,'custom'], 
    required: false // Make it optional for now to not break older campaigns
  },
  // --- END OF FIX ---
  rules: {
    segments: [{ type: String }],
    schedule: {
      startTime: { type: Date, required: true },
      endTime: { type: Date, required: true },
      timezone: { type: String, default: 'UTC' },
      recurrence: {
        type: { type: String, enum: ['daily', 'weekly', 'monthly'] },
        daysOfWeek: [{ type: Number, min: 0, max: 6 }],
        daysOfMonth: [{ type: Number, min: 1, max: 31 }],
        interval: { type: Number, min: 1 }
      }
    },
    frequencyCapping: {
      maxImpressions: { type: Number, default: 5 },
      period: { type: String, enum: ['hour', 'day', 'week'], default: 'day' },
      perUser: { type: Boolean, default: true },
      maxClicks: { type: Number }
    },
    targeting: {
      geo: {
        countries: [{ type: String }],
        regions: [{ type: String }],
        cities: [{ type: String }],
        radius: { type: Number },
        coordinates: {
          lat: { type: Number },
          lng: { type: Number }
        }
      },
      devices: {
        platforms: [{ type: String }],
        osVersions: [{ type: String }],
        appVersions: [{ type: String }],
        deviceModels: [{ type: String }],
        connectionTypes: [{ type: String }]
      },
      userAttributes: {
        segments: [{ type: String }],
        customAttributes: { type: Map, of: Schema.Types.Mixed },
        ageRange: {
          min: { type: Number, min: 0, max: 120 },
          max: { type: Number, min: 0, max: 120 }
        },
        genders: [{ type: String }],
        languages: [{ type: String }],
        subscriptionTiers: [{ type: String }]
      },
      behavior: {
        minSessions: { type: Number },
        hasPurchased: { type: Boolean },
        lastActiveWithinDays: { type: Number },
        favoriteCategories: [{ type: String }],
        engagementScore: {
          min: { type: Number },
          max: { type: Number }
        }
      },
      customRules: [{
        field: { type: String, required: true },
        operator: { 
          type: String, 
          enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in'],
          required: true 
        },
        value: { type: Schema.Types.Mixed, required: true }
      }]
    },
    constraints: {
      dailyBudget: { type: Number },
      totalBudget: { type: Number },
      maxImpressions: { type: Number },
      maxClicks: { type: Number },
      maxConversions: { type: Number }
    }
  },
  contentIds: [{ type: String, required: true }],
  priority: { type: Number, default: 1, min: 1, max: 10 },
  budget: {
    total: { type: Number },
    spent: { type: Number, default: 0 },
    dailyLimit: { type: Number },
    type: { type: String, enum: ['cpc', 'cpm', 'cpa'] },
    currency: { type: String, default: 'USD' }
  },
  statistics: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    spend: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  metadata: { type: Map, of: Schema.Types.Mixed },
  createdBy: { type: String, required: true },
  updatedBy: { type: String, required: true }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for performance
CampaignSchema.index({ tenantId: 1, status: 1 });
CampaignSchema.index({ tenantId: 1, 'rules.schedule.startTime': 1, 'rules.schedule.endTime': 1 });
CampaignSchema.index({ tenantId: 1, 'rules.targeting.geo.countries': 1 });
CampaignSchema.index({ tenantId: 1, 'rules.segments': 1 });

export const Campaign: Model<ICampaign> = model<ICampaign>('Campaign', CampaignSchema);