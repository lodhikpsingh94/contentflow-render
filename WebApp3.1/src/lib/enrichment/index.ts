// src/lib/enrichment/index.ts
import { fetchFromApi } from '../api';
import { EnrichmentUploadPayload, UploadJobResult, UploadHistoryItem } from './types';

export const uploadEnrichmentData = (
  payload: EnrichmentUploadPayload
): Promise<UploadJobResult> => {
  return fetchFromApi<UploadJobResult>('/enrichment/upload', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const getUploadHistory = (): Promise<UploadHistoryItem[]> => {
  return fetchFromApi<UploadHistoryItem[]>('/enrichment/uploads');
};

export * from './types';
