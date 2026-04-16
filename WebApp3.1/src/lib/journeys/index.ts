import { fetchFromApi } from '../api';
import { Journey, NewJourneyData } from './types';

interface JourneysResponse {
  data: Journey[];
}

export const getJourneys = (): Promise<JourneysResponse> => {
  return fetchFromApi<JourneysResponse>('/journeys');
};

export const createJourney = (journeyData: NewJourneyData): Promise<{ data: Journey }> => {
  return fetchFromApi<{ data: Journey }>('/journeys', {
    method: 'POST',
    body: JSON.stringify(journeyData),
  });
};