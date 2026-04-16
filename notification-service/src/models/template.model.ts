import { Schema, Document, Model, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ITemplate extends Document {
  _id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'email' | 'push' | 'sms' | 'in_app';
  category: string;
  subject: string;
  content: TemplateContent;
  variables: TemplateVariable[];
  isActive: boolean;
  version: number;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateContent {
  html: string;
  text: string;
  title?: string;
  preheader?: string;
  data?: Record<string, any>;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  description?: string;
}

const TemplateSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  type: { 
    type: String, 
    enum: ['email', 'push', 'sms', 'in_app'], 
    required: true,
    index: true 
  },
  category: { type: String, required: true, index: true },
  subject: { type: String, required: true },
  content: {
    html: { type: String, required: true },
    text: { type: String, required: true },
    title: { type: String },
    preheader: { type: String },
    data: { type: Map, of: Schema.Types.Mixed }
  },
  variables: [{
    name: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['string', 'number', 'boolean', 'date', 'array', 'object'],
      required: true 
    },
    required: { type: Boolean, default: false },
    defaultValue: { type: Schema.Types.Mixed },
    description: { type: String }
  }],
  isActive: { type: Boolean, default: true, index: true },
  version: { type: Number, default: 1 },
  createdBy: { type: String, required: true },
  updatedBy: { type: String, required: true }
}, {
  timestamps: true,
  versionKey: false
});

TemplateSchema.index({ tenantId: 1, name: 1, version: 1 }, { unique: true });
TemplateSchema.index({ tenantId: 1, type: 1, isActive: 1 });

export const Template: Model<ITemplate> = model<ITemplate>('Template', TemplateSchema);