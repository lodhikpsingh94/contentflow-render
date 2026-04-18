import { Schema, Document, Model, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * A single typed attribute value with provenance and optional TTL.
 */
export interface IEnrichmentAttribute {
  value: any;
  /** Declared type — used by the segment rule builder for correct operator choices. */
  type: 'string' | 'number' | 'boolean' | 'date';
  /** If set, the attribute is considered expired after this date and ignored by the engine. */
  expiresAt?: Date;
}

/**
 * UserEnrichment — stores external customer attributes per source per user.
 *
 * Sources:
 *   csv_upload    — batch file uploaded by a tenant admin through the dashboard
 *   crm_webhook   — real-time push from a CRM integration (Salesforce, HubSpot …)
 *   erp_sync      — scheduled pull from an ERP or loyalty system
 *   loyalty_api   — real-time loyalty platform webhook
 *   manual_api    — direct API write by the tenant (back-office tooling)
 *
 * Multiple documents per user are allowed (one per source upload/sync).
 * The EnrichmentEngine picks the most recently-uploaded non-expired value for
 * each attribute across all docs.
 *
 * Segment rule field path: "enrichment.<attributeName>"
 * Example:  { field: "enrichment.loyaltyTier", operator: "in", value: ["gold","platinum"] }
 */
export interface IUserEnrichment extends Document {
  _id: string;
  tenantId: string;
  userId: string;
  source: 'csv_upload' | 'crm_webhook' | 'erp_sync' | 'loyalty_api' | 'manual_api';
  /** Upload job ID, integration name, or any ref that lets you audit the origin. */
  sourceRef: string;
  uploadedAt: Date;
  uploadedBy: string;   // admin userId or system identifier
  /** Attribute bag — keyed by attribute name (e.g. "loyaltyTier", "lifetimeValue") */
  attributes: Map<string, IEnrichmentAttribute>;
}

const EnrichmentAttributeSchema = new Schema<IEnrichmentAttribute>(
  {
    value:     { type: Schema.Types.Mixed, required: true },
    type:      { type: String, enum: ['string', 'number', 'boolean', 'date'], required: true },
    expiresAt: { type: Date },
  },
  { _id: false }
);

const UserEnrichmentSchema = new Schema<IUserEnrichment>(
  {
    _id:        { type: String, default: uuidv4 },
    tenantId:   { type: String, required: true },
    userId:     { type: String, required: true },
    source:     {
      type: String,
      enum: ['csv_upload', 'crm_webhook', 'erp_sync', 'loyalty_api', 'manual_api'],
      required: true,
    },
    sourceRef:  { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String, required: true },
    attributes: { type: Map, of: EnrichmentAttributeSchema },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Primary lookup index: fetch all enrichments for a user in one query
UserEnrichmentSchema.index({ tenantId: 1, userId: 1 });
// Allow filtering by source to support selective refresh/invalidation
UserEnrichmentSchema.index({ tenantId: 1, source: 1, uploadedAt: -1 });

export const UserEnrichment: Model<IUserEnrichment> = model<IUserEnrichment>(
  'UserEnrichment',
  UserEnrichmentSchema
);
