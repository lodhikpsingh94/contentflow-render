import { fetchFromApi } from '../api';
import { Segment, NewSegmentData, SegmentRule, AudienceEstimate, EnrichmentAttributeMeta } from './types';

interface PaginatedSegmentsResponse {
  data: Segment[];
}

export const getSegments = (): Promise<PaginatedSegmentsResponse> => {
  return fetchFromApi<PaginatedSegmentsResponse>('/segments');
};

export const createSegment = (segmentData: NewSegmentData): Promise<{ data: Segment }> => {
  return fetchFromApi<{ data: Segment }>('/segments', {
    method: 'POST',
    body: JSON.stringify(segmentData),
  });
};

export const getSegmentById = (id: string): Promise<{ data: Segment }> => {
  return fetchFromApi<{ data: Segment }>(`/segments/${id}`);
};

/**
 * Estimates the audience size for a given set of rules without saving a segment.
 * Useful for live preview while building a segment.
 * Passing an empty rules array returns the total user count for the tenant.
 */
export const estimateAudience = (
  rules: SegmentRule[],
  logicalOperator: 'AND' | 'OR' = 'AND'
): Promise<{ data: AudienceEstimate }> => {
  return fetchFromApi<{ data: AudienceEstimate }>('/segments/estimate', {
    method: 'POST',
    body: JSON.stringify({ rules, logicalOperator }),
  });
};

/**
 * Returns all enrichment attribute keys/types that have been uploaded for this
 * tenant via CSV.  The segment rule-builder calls this on mount to populate the
 * dynamic "Custom Data (CSV)" field group.
 */
export const getEnrichmentAttributes = (): Promise<{ data: EnrichmentAttributeMeta[] }> => {
  return fetchFromApi<{ data: EnrichmentAttributeMeta[] }>('/segments/enrichment-attributes');
};