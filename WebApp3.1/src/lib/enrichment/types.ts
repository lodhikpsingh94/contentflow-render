// src/lib/enrichment/types.ts

export type AttributeType = 'string' | 'number' | 'boolean' | 'date';

export interface ColumnMapping {
  csvHeader: string;
  attributeName: string;    // stored attribute key
  attributeType: AttributeType;
  include: boolean;
}

export interface EnrichmentRecord {
  userId: string;
  attributes: Record<string, any>;
}

export interface EnrichmentUploadPayload {
  source: 'csv_upload';
  sourceRef: string;
  attributeTypes: Record<string, AttributeType>;
  expiresAt?: string;
  records: EnrichmentRecord[];
}

export interface UploadJobResult {
  jobRef: string;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ userId: string; error: string }>;
  uploadedAt: string;
}

export interface UploadHistoryItem {
  sourceRef: string;
  source: string;
  uploadedAt: string;
  uploadedBy: string;
  recordCount: number;
  attributeCount: number;
}
