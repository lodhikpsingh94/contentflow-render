import { Schema, Document, Model, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IAnalytics extends Document {
  _id: string;
  tenantId: string;
  campaignId: string;
  date: Date;
  metrics: AnalyticsMetrics;
  breakdown?: AnalyticsBreakdown;
}

export interface AnalyticsMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
  uniqueUsers: number;
}

export interface AnalyticsBreakdown {
  byHour?: { [hour: string]: AnalyticsMetrics };
  byCountry?: { [country: string]: AnalyticsMetrics };
  byDevice?: { [device: string]: AnalyticsMetrics };
  bySegment?: { [segment: string]: AnalyticsMetrics };
}

const AnalyticsSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  tenantId: { type: String, required: true, index: true },
  campaignId: { type: String, required: true, index: true },
  date: { type: Date, required: true, index: true },
  metrics: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    spend: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    uniqueUsers: { type: Number, default: 0 }
  },
  breakdown: {
    byHour: { type: Map, of: Object },
    byCountry: { type: Map, of: Object },
    byDevice: { type: Map, of: Object },
    bySegment: { type: Map, of: Object }
  }
}, {
  timestamps: true,
  versionKey: false
});

AnalyticsSchema.index({ tenantId: 1, campaignId: 1, date: 1 }, { unique: true });
AnalyticsSchema.index({ tenantId: 1, date: 1 });

export const Analytics: Model<IAnalytics> = model<IAnalytics>('Analytics', AnalyticsSchema);