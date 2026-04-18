import { Schema, Document, Model, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// ─── Channel content block (bilingual: Arabic + English) ─────────────────────
export interface ContentBlock {
  headline?: string;
  body?: string;
  ctaText?: string;
  ctaUrl?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'gif';
  direction: 'rtl' | 'ltr';
  // WhatsApp-specific
  whatsappTemplateId?: string;
  whatsappTemplateLang?: string;
  // SMS-specific
  smsFrom?: string;
}

// ─── A/B Test variant ─────────────────────────────────────────────────────────
export interface CampaignVariant {
  id: string;
  name: string;
  weight: number;         // 0–100; all weights must sum to 100
  content: {
    ar?: ContentBlock;
    en?: ContentBlock;
  };
  metadata?: Record<string, any>;   // visual editor overrides per variant
  statistics: {
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
  };
}

// ─── Approval workflow ────────────────────────────────────────────────────────
export interface ApprovalHistoryEntry {
  action: 'submitted' | 'approved' | 'rejected' | 'recalled';
  by: string;       // userId of reviewer / submitter
  at: Date;
  note?: string;    // rejection reason
}

// ─── Hijri date ───────────────────────────────────────────────────────────────
export interface HijriDate {
  year: number;
  month: number;   // 1–12
  day: number;
}

// ─── Main interfaces ──────────────────────────────────────────────────────────
export interface ICampaign extends Document {
  _id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: 'draft' | 'pending_review' | 'approved' | 'scheduled' | 'active' | 'paused' | 'completed' | 'expired' | 'rejected';
  type: 'banner' | 'video' | 'popup' | 'inapp_notification' | 'push_notification' | 'sms' | 'whatsapp';
  subType: 'image' | 'video' | 'gif' | 'custom';

  // Bilingual content
  content: {
    ar?: ContentBlock;
    en?: ContentBlock;
  };

  // Placement
  placementIds: string[];   // e.g. ['dashboard_top', 'home_fullscreen']

  rules: CampaignRules;
  contentIds: string[];
  priority: number;
  budget?: CampaignBudget;
  statistics: CampaignStatistics;
  metadata?: Record<string, any>;

  // A/B testing
  variants: CampaignVariant[];
  abTestEndCondition?: 'date' | 'impressions' | 'confidence';
  abTestWinnerVariantId?: string;

  // Approval workflow
  approvalStatus: 'not_required' | 'pending_review' | 'approved' | 'rejected';
  approvalHistory: ApprovalHistoryEntry[];
  reviewRequired: boolean;

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
  // Prayer time blackout (Saudi Arabia)
  prayerTimeBlackout: boolean;
  prayerTimeCity?: string;        // 'riyadh' | 'jeddah' | 'mecca' | 'medina' | 'dammam'
  blackoutCustomWindows?: Array<{
    startMinutesFromMidnight: number;
    endMinutesFromMidnight: number;
  }>;
  // Hijri / seasonal scheduling
  hijriStart?: HijriDate;
  hijriEnd?: HijriDate;
  seasonalTag?: 'ramadan' | 'eid_fitr' | 'eid_adha' | 'national_day' | 'founding_day' | 'hajj_season' | 'custom';
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
  coordinates?: { lat: number; lng: number };
}

export interface DeviceTargeting {
  platforms: string[];
  osVersions: string[];
  appVersions: string[];
  deviceModels?: string[];
  connectionTypes?: string[];
  networkOperators?: string[];    // 'stc' | 'mobily' | 'zain'
}

export interface UserAttributeTargeting {
  segments: string[];
  customAttributes: Record<string, any>;
  ageRange?: { min: number; max: number };
  genders?: string[];
  languages?: string[];
  nationalities?: string[];       // Saudi-market: 'SA' | 'EG' | 'PK' …
  subscriptionTiers?: string[];
  requireMarketingConsent?: boolean;  // PDPL: only target consented users
  requireChannelConsent?: boolean;    // channel-specific consent (push/sms/whatsapp)
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
  currency: string;   // Default: 'SAR'
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

// ─── Schema ───────────────────────────────────────────────────────────────────
const ContentBlockSchema = new Schema({
  headline: { type: String },
  body: { type: String },
  ctaText: { type: String },
  ctaUrl: { type: String },
  mediaUrl: { type: String },
  mediaType: { type: String, enum: ['image', 'video', 'gif'] },
  direction: { type: String, enum: ['rtl', 'ltr'], default: 'ltr' },
  whatsappTemplateId: { type: String },
  whatsappTemplateLang: { type: String, default: 'ar' },
  smsFrom: { type: String },
}, { _id: false });

const VariantStatsSchema = new Schema({
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  ctr: { type: Number, default: 0 },
}, { _id: false });

const CampaignVariantSchema = new Schema({
  id: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  weight: { type: Number, required: true, min: 0, max: 100 },
  content: {
    ar: { type: ContentBlockSchema },
    en: { type: ContentBlockSchema },
  },
  metadata: { type: Map, of: Schema.Types.Mixed },
  statistics: { type: VariantStatsSchema, default: () => ({}) },
}, { _id: false });

const ApprovalHistorySchema = new Schema({
  action: { type: String, enum: ['submitted', 'approved', 'rejected', 'recalled'], required: true },
  by: { type: String, required: true },
  at: { type: Date, required: true },
  note: { type: String },
}, { _id: false });

const HijriDateSchema = new Schema({
  year: { type: Number, required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  day: { type: Number, required: true, min: 1, max: 30 },
}, { _id: false });

const CampaignSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'scheduled', 'active', 'paused', 'completed', 'expired', 'rejected'],
    default: 'draft',
    index: true,
  },
  type: {
    type: String,
    enum: ['banner', 'video', 'popup', 'inapp_notification', 'push_notification', 'sms', 'whatsapp'],
    required: true,
  },
  subType: {
    type: String,
    enum: ['image', 'video', 'gif', 'custom'],
    default: 'custom',
  },

  // Bilingual content block
  content: {
    ar: { type: ContentBlockSchema },
    en: { type: ContentBlockSchema },
  },

  // Placement IDs
  placementIds: [{ type: String }],

  rules: {
    segments: [{ type: String }],
    schedule: {
      startTime: { type: Date, required: true },
      endTime: { type: Date, required: true },
      timezone: { type: String, default: 'Asia/Riyadh' },
      recurrence: {
        type: { type: String, enum: ['daily', 'weekly', 'monthly'] },
        daysOfWeek: [{ type: Number, min: 0, max: 6 }],
        daysOfMonth: [{ type: Number, min: 1, max: 31 }],
        interval: { type: Number, min: 1 },
      },
      // Prayer time blackout
      prayerTimeBlackout: { type: Boolean, default: false },
      prayerTimeCity: { type: String, default: 'riyadh' },
      blackoutCustomWindows: [{
        startMinutesFromMidnight: { type: Number, required: true },
        endMinutesFromMidnight: { type: Number, required: true },
      }],
      // Hijri / seasonal
      hijriStart: { type: HijriDateSchema },
      hijriEnd: { type: HijriDateSchema },
      seasonalTag: {
        type: String,
        enum: ['ramadan', 'eid_fitr', 'eid_adha', 'national_day', 'founding_day', 'hajj_season', 'custom'],
      },
    },
    frequencyCapping: {
      maxImpressions: { type: Number, default: 5 },
      period: { type: String, enum: ['hour', 'day', 'week'], default: 'day' },
      perUser: { type: Boolean, default: true },
      maxClicks: { type: Number },
    },
    targeting: {
      geo: {
        countries: [{ type: String }],
        regions: [{ type: String }],
        cities: [{ type: String }],
        radius: { type: Number },
        coordinates: { lat: { type: Number }, lng: { type: Number } },
      },
      devices: {
        platforms: [{ type: String }],
        osVersions: [{ type: String }],
        appVersions: [{ type: String }],
        deviceModels: [{ type: String }],
        connectionTypes: [{ type: String }],
        networkOperators: [{ type: String }],
      },
      userAttributes: {
        segments: [{ type: String }],
        customAttributes: { type: Map, of: Schema.Types.Mixed },
        ageRange: { min: { type: Number }, max: { type: Number } },
        genders: [{ type: String }],
        languages: [{ type: String }],
        nationalities: [{ type: String }],
        subscriptionTiers: [{ type: String }],
        requireMarketingConsent: { type: Boolean, default: true },
        requireChannelConsent: { type: Boolean, default: true },
      },
      behavior: {
        minSessions: { type: Number },
        hasPurchased: { type: Boolean },
        lastActiveWithinDays: { type: Number },
        favoriteCategories: [{ type: String }],
        engagementScore: { min: { type: Number }, max: { type: Number } },
      },
      customRules: [{
        field: { type: String, required: true },
        operator: {
          type: String,
          enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in'],
          required: true,
        },
        value: { type: Schema.Types.Mixed, required: true },
      }],
    },
    constraints: {
      dailyBudget: { type: Number },
      totalBudget: { type: Number },
      maxImpressions: { type: Number },
      maxClicks: { type: Number },
      maxConversions: { type: Number },
    },
  },

  contentIds: [{ type: String }],
  priority: { type: Number, default: 5, min: 1, max: 10 },

  budget: {
    total: { type: Number },
    spent: { type: Number, default: 0 },
    dailyLimit: { type: Number },
    type: { type: String, enum: ['cpc', 'cpm', 'cpa'] },
    currency: { type: String, default: 'SAR' },    // ← SAR default
  },

  statistics: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    spend: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },

  metadata: { type: Map, of: Schema.Types.Mixed },

  // A/B testing
  variants: [CampaignVariantSchema],
  abTestEndCondition: { type: String, enum: ['date', 'impressions', 'confidence'] },
  abTestWinnerVariantId: { type: String },

  // Approval workflow
  approvalStatus: {
    type: String,
    enum: ['not_required', 'pending_review', 'approved', 'rejected'],
    default: 'not_required',
    index: true,
  },
  approvalHistory: [ApprovalHistorySchema],
  reviewRequired: { type: Boolean, default: false },

  createdBy: { type: String, required: true },
  updatedBy: { type: String, required: true },
}, {
  timestamps: true,
  versionKey: false,
});

// Pre-save: strip null/undefined for optional enum fields so Mongoose
// doesn't reject them when the frontend sends null instead of omitting the key
CampaignSchema.pre('save', function (next) {
  const schedule = (this as any).rules?.schedule;
  if (schedule) {
    if (schedule.seasonalTag == null) delete schedule.seasonalTag;
    if (schedule.prayerTimeCity == null) delete schedule.prayerTimeCity;
  }
  const self = this as any;
  if (self.subType == null) delete self.subType;
  next();
});

// Indexes
CampaignSchema.index({ tenantId: 1, status: 1 });
CampaignSchema.index({ tenantId: 1, type: 1 });
CampaignSchema.index({ tenantId: 1, approvalStatus: 1 });
CampaignSchema.index({ tenantId: 1, placementIds: 1 });
CampaignSchema.index({ tenantId: 1, 'rules.schedule.startTime': 1, 'rules.schedule.endTime': 1 });
CampaignSchema.index({ tenantId: 1, 'rules.targeting.geo.countries': 1 });
CampaignSchema.index({ tenantId: 1, 'rules.segments': 1 });

export const Campaign: Model<ICampaign> = model<ICampaign>('Campaign', CampaignSchema);
