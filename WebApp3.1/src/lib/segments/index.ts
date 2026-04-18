import { fetchFromApi } from '../api';
import { Segment, NewSegmentData, SegmentRule, AudienceEstimate } from './types';

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