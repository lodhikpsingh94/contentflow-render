import { Schema, Document, Model, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IRuleTemplate extends Document {
  _id: string;
  tenantId: string;
  name: string;
  description?: string;
  category: string;
  template: RuleTemplate;
  parameters: RuleParameter[];
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleTemplate {
  field: string;
  operator: string;
  valueTemplate: string;
  descriptionTemplate: string;
}

export interface RuleParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'date';
  required: boolean;
  defaultValue?: any;
  options?: any[];
}

const RuleTemplateSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  category: { type: String, required: true, index: true },
  template: {
    field: { type: String, required: true },
    operator: { type: String, required: true },
    valueTemplate: { type: String, required: true },
    descriptionTemplate: { type: String, required: true }
  },
  parameters: [{
    name: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['string', 'number', 'boolean', 'array', 'date'],
      required: true 
    },
    required: { type: Boolean, default: false },
    defaultValue: { type: Schema.Types.Mixed },
    options: [{ type: Schema.Types.Mixed }]
  }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: String, required: true },
  updatedBy: { type: String, required: true }
}, {
  timestamps: true,
  versionKey: false
});

RuleTemplateSchema.index({ tenantId: 1, category: 1, isActive: 1 });

export const RuleTemplate: Model<IRuleTemplate> = model<IRuleTemplate>('RuleTemplate', RuleTemplateSchema);