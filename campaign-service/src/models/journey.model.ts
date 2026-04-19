import mongoose, { Document, Schema } from 'mongoose';

export interface IJourneyNode {
  id: string;
  type: string;
  data: Record<string, any>;
  position: { x: number; y: number };
}

export interface IJourneyEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface IJourney extends Document {
  _id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused';
  nodes: IJourneyNode[];
  edges: IJourneyEdge[];
  stats: {
    entered: number;
    completed: number;
    active: number;
  };
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const JourneyNodeSchema = new Schema({
  id:       { type: String, required: true },
  type:     { type: String, required: true },
  data:     { type: Schema.Types.Mixed, default: {} },
  position: { x: { type: Number, default: 0 }, y: { type: Number, default: 0 } },
}, { _id: false });

const JourneyEdgeSchema = new Schema({
  id:     { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  label:  { type: String },
}, { _id: false });

const JourneySchema = new Schema<IJourney>({
  tenantId:    { type: String, required: true, index: true },
  name:        { type: String, required: true },
  description: { type: String },
  status:      { type: String, enum: ['draft', 'active', 'paused'], default: 'draft' },
  nodes:       [JourneyNodeSchema],
  edges:       [JourneyEdgeSchema],
  stats: {
    entered:   { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    active:    { type: Number, default: 0 },
  },
  createdBy: { type: String, required: true },
  updatedBy: { type: String, required: true },
}, { timestamps: true });

export const Journey = mongoose.model<IJourney>('Journey', JourneySchema);
