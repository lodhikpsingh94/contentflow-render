// C:\...\Content-Service\src\models\asset.model.ts

import { Schema, Document, model } from 'mongoose';

export interface IAsset extends Document {
  _id: string; // Using our own UUIDs
  tenantId: string;
  name: string;
  mimeType: string;
  size: number; // Store size in bytes
  folder?: string;
  tags?: string[];
  uploadedBy?: string;
  storageKey: string; // The path/key in MinIO
  publicUrl: string;
}

const AssetSchema = new Schema({
  _id: { type: String, required: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  folder: { type: String, index: true },
  tags: { type: [String], index: true },
  uploadedBy: { type: String },
  storageKey: { type: String, required: true },
  publicUrl: { type: String, required: true },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  versionKey: false,
  _id: false // We use our own _id
});

export const Asset = model<IAsset>('Asset', AssetSchema);