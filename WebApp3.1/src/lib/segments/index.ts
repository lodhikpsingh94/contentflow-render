import { fetchFromApi } from '../api';
import { Segment, NewSegmentData } from './types';

interface PaginatedSegmentsResponse {
    data: Segment[];
    // include pagination metadata if your API provides it
}

/**
 * Fetches a list of all segments for the tenant.
 */
export const getSegments = (): Promise<PaginatedSegmentsResponse> => {
  return fetchFromApi<PaginatedSegmentsResponse>('/segments');
};

/**
 * Creates a new user segment.
 * @param segmentData The data for the new segment.
 */
export const createSegment = (segmentData: NewSegmentData): Promise<{ data: Segment }> => {
    return fetchFromApi<{ data: Segment }>('/segments', {
        method: 'POST',
        body: JSON.stringify(segmentData),
    });
};

export const getSegmentById = (id: string): Promise<{ data: Segment }> => {
  return fetchFromApi<{ data: Segment }>(`/segments/${id}`);
};