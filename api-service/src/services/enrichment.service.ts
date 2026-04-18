import { Injectable } from '@nestjs/common';
import { EnrichmentClient, EnrichmentUploadPayload } from '../clients/enrichment.client';

@Injectable()
export class EnrichmentService {
  constructor(private readonly enrichmentClient: EnrichmentClient) {}

  async uploadData(payload: EnrichmentUploadPayload, tenantId: string, authToken?: string) {
    const response = await this.enrichmentClient.uploadEnrichmentData(payload, tenantId, authToken);
    return response.data;
  }

  async getUploadHistory(tenantId: string, authToken?: string) {
    const response = await this.enrichmentClient.getUploadHistory(tenantId, authToken);
    return response.data;
  }

  async getUserAttributes(userId: string, tenantId: string, authToken?: string) {
    const response = await this.enrichmentClient.getUserEnrichmentAttributes(userId, tenantId, authToken);
    return response.data;
  }
}
