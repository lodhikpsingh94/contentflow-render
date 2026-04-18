import { Schema, Document, Model, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IRule extends Document {
  _id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'segment' | 'targeting' | 'behavioral';
  conditions: RuleCondition[];
  isActive: boolean;
  priority: number;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'exists' | 'regex';
  value: any;
  logicalOperator?: 'and' | 'or';
}

const RuleSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  type: { 
    type: String, 
    enum: ['segment', 'targeting', 'behavioral'], 
    required: true 
  },
  conditions: [{
    field: { type: String, required: true },
    operator: { 
      type: String, 
      enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in', 'exists', 'regex'],
      required: true 
    },
    value: { type: Schema.Types.Mixed },
    logicalOperator: { type: String, enum: ['and', 'or'] }
  }],
  isActive: { type: Boolean, default: true, index: true },
  priority: { type: Number, default: 1, min: 1, max: 10 },
  createdBy: { type: String, required: true },
  updatedBy: { type: String, required: true }
}, {
  timestamps: true,
  versionKey: false
});

RuleSchema.index({ tenantId: 1, type: 1, isActive: 1 });

export const Rule: Model<IRule> = model<IRule>('Rule', RuleSchema);