import { fetchFromApi } from '../api';
import { Journey, NewJourneyData } from './types';

interface JourneysResponse {
  data: Journey[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

export const getJourneys = (): Promise<JourneysResponse> => {
  return fetchFromApi<JourneysResponse>('/journeys');
};

export const getJourneyById = (id: string): Promise<{ data: Journey }> => {
  return fetchFromApi<{ data: Journey }>(`/journeys/${id}`);
};

export const createJourney = (journeyData: NewJourneyData): Promise<{ data: Journey }> => {
  return fetchFromApi<{ data: Journey }>('/journeys', {
    method: 'POST',
    body: JSON.stringify(journeyData),
  });
};

export const updateJourney = (id: string, journeyData: Partial<NewJourneyData>): Promise<{ data: Journey }> => {
  return fetchFromApi<{ data: Journey }>(`/journeys/${id}`, {
    method: 'PUT',
    body: JSON.stringify(journeyData),
  });
};

export const updateJourneyStatus = (id: string, status: string): Promise<{ data: Journey }> => {
  return fetchFromApi<{ data: Journey }>(`/journeys/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};

export const deleteJourney = (id: string): Promise<{ data: { deleted: boolean } }> => {
  return fetchFromApi<{ data: { deleted: boolean } }>(`/journeys/${id}`, {
    method: 'DELETE',
  });
};
