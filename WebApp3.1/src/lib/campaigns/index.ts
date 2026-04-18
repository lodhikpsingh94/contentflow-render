import { fetchFromApi } from '../api';
import { Campaign, NewCampaignData } from './types';

// The backend returns { data: { campaigns: [], total: 0 }, metadata: {...} }
// Our fetchFromApi returns { campaigns: [], total: 0 }
interface PaginatedCampaignsResponse {
  data: Campaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// CORRECTED: Function now accepts page and limit
export const getCampaigns = (page: number = 1, limit: number = 10): Promise<PaginatedCampaignsResponse> => {
  return fetchFromApi<PaginatedCampaignsResponse>(`/campaigns?page=${page}&limit=${limit}`);
};

// The backend returns { data: THE_CAMPAIGN_OBJECT, metadata: {...} }
// Our fetchFromApi returns THE_CAMPAIGN_OBJECT
export const getCampaignById = (id: string): Promise<Campaign> => {
  return fetchFromApi<Campaign>(`/campaigns/${id}`);
};

// The backend returns { data: THE_CREATED_CAMPAIGN, metadata: {...} }
export const createCampaign = (campaignData: NewCampaignData): Promise<Campaign> => {
    return fetchFromApi<Campaign>('/campaigns', {
        method: 'POST',
        body: JSON.stringify(campaignData),
    });
};

export const updateCampaign = (id: string, campaignData: Partial<NewCampaignData>): Promise<Campaign> => {
    return fetchFromApi<Campaign>(`/campaigns/${id}`, {
        method: 'PUT',
        body: JSON.stringify(campaignData),
    });
};

export const updateCampaignStatus = (id: string, status: string): Promise<Campaign> => {
  return fetchFromApi<Campaign>(`/campaigns/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};

export const deleteCampaign = (id: string): Promise<void> => {
  return fetchFromApi<void>(`/campaigns/${id}`, {
    method: 'DELETE',
  });
};