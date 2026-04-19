import { Injectable } from '@nestjs/common';
import { EnrichmentClient, EnrichmentUploadPayload } from '../clients/enrichment.client';

@Injectable()
export class EnrichmentService {
  constructor(private readonly enrichmentClient: EnrichmentClient) {}

  async uploadData(payload: EnrichmentUploadPayload, tenantId: string) {
    const response = await this.enrichmentClient.uploadEnrichmentData(payload, tenantId);
    return response.data;
  }

  async getUploadHistory(tenantId: string) {
    const response = await this.enrichmentClient.getUploadHistory(tenantId);
    return response.data;
  }

  async getUserAttributes(userId: string, tenantId: string) {
    const response = await this.enrichmentClient.getUserEnrichmentAttributes(userId, tenantId);
    return response.data;
  }
}
