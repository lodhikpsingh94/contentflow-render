import { Schema, Document, Model, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ISegment extends Document {
  _id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'system' | 'custom' | 'dynamic';
  rules: SegmentRule[];
  userCount: number;
  isActive: boolean;
  autoUpdate: boolean;
  updateFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  lastUpdated: Date;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentRule {
  field: string;
  operator: RuleOperator;
  value: any;
  weight?: number;
  conditions?: SegmentRule[];
  logicalOperator?: 'AND' | 'OR';
}

export type RuleOperator =
  | 'equals' | 'not_equals'
  | 'greater_than' | 'less_than' | 'between'
  | 'contains' | 'not_contains'
  | 'in' | 'not_in'
  | 'exists' | 'not_exists'
  | 'regex' | 'not_regex'
  | 'starts_with' | 'ends_with'
  | 'date_after' | 'date_before' | 'days_ago'
  | 'json_path'
  // Device / location operators
  | 'geo_radius'           // value: { lat, lng, radiusKm }
  | 'app_version_gte'      // value: "2.0.0" — semver comparison
  // Consent operators
  | 'is_true' | 'is_false';

const SegmentSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  type: { 
    type: String, 
    enum: ['system', 'custom', 'dynamic'], 
    default: 'custom',
    index: true 
  },
  rules: [{
    field: { type: String, required: true },
    operator: { 
      type: String, 
      enum: [
        'equals', 'not_equals', 'greater_than', 'less_than', 'between',
        'contains', 'not_contains', 'in', 'not_in', 'exists', 'not_exists',
        'regex', 'not_regex', 'starts_with', 'ends_with',
        'geo_radius', 'app_version_gte', 'is_true', 'is_false',
        'date_after', 'date_before', 'days_ago'
      ],
      required: true 
    },
    value: { type: Schema.Types.Mixed },
    weight: { type: Number, min: 0, max: 1, default: 1 },
    conditions: { type: [Schema.Types.Mixed] }, // Nested rules
    logicalOperator: { type: String, enum: ['AND', 'OR'], default: 'AND' }
  }],
  userCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
  autoUpdate: { type: Boolean, default: false },
  updateFrequency: { 
    type: String, 
    enum: ['realtime', 'hourly', 'daily', 'weekly'], 
    default: 'realtime' 
  },
  lastUpdated: { type: Date, default: Date.now },
  createdBy: { type: String, required: true },
  updatedBy: { type: String, required: true }
}, {
  timestamps: true,
  versionKey: false
});

SegmentSchema.index({ tenantId: 1, name: 1 }, { unique: true });
SegmentSchema.index({ tenantId: 1, type: 1, isActive: 1 });

export const Segment: Model<ISegment> = model<ISegment>('Segment', SegmentSchema);