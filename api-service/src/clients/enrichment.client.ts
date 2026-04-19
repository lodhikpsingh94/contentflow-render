import { Injectable } from '@nestjs/common';
import { BaseClient } from './base.client';
import { ServiceResponse } from '../models/shared/common.types';

export interface EnrichmentUploadPayload {
  source?: string;
  sourceRef: string;
  attributeTypes?: Record<string, 'string' | 'number' | 'boolean' | 'date'>;
  expiresAt?: string;
  records: Array<{ userId: string; attributes: Record<string, any> }>;
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

@Injectable()
export class EnrichmentClient extends BaseClient {
  constructor() {
    super(
      `${process.env.SEGMENT_SERVICE_URL || 'http://localhost:3003'}/api/v1`,
      'EnrichmentClient',
      parseInt(process.env.SEGMENT_SERVICE_TIMEOUT || '30000') // longer timeout for bulk uploads
    );
  }

  private get serviceAuthHeader(): { Authorization: string } {
    const token = process.env.INTERNAL_SERVICE_TOKEN;
    if (!token) {
      this.logger.warn('INTERNAL_SERVICE_TOKEN is not set — enrichment service calls may be rejected');
    }
    return { Authorization: `Bearer ${token || ''}` };
  }

  async uploadEnrichmentData(
    payload: EnrichmentUploadPayload,
    tenantId: string,
  ): Promise<ServiceResponse<UploadJobResult>> {
    return this.request<UploadJobResult>({
      method: 'POST',
      url: '/enrichment/upload',
      data: payload,
    }, tenantId, this.serviceAuthHeader);
  }

  async getUploadHistory(tenantId: string): Promise<ServiceResponse<UploadHistoryItem[]>> {
    return this.request<UploadHistoryItem[]>({
      method: 'GET',
      url: '/enrichment/uploads',
    }, tenantId, this.serviceAuthHeader);
  }

  async getUserEnrichmentAttributes(userId: string, tenantId: string): Promise<ServiceResponse<any>> {
    return this.request<any>({
      method: 'GET',
      url: `/enrichment/user/${userId}`,
    }, tenantId, this.serviceAuthHeader);
  }
}
