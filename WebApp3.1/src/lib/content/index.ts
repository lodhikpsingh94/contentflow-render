import { fetchFromApi } from '../api';
import { PaginatedContentResponse, ContentAsset } from './types';

/**
 * Fetches a paginated list of content assets.
 */
export const getContentAssets = (page: number = 1, limit: number = 20): Promise<PaginatedContentResponse> => {
  // The API service wraps the response, so we expect the final data directly
  return fetchFromApi<PaginatedContentResponse>(`/content?page=${page}&limit=${limit}`);
};

/**
 * NEW: Step 1 of the upload process. Asks the backend for a secure URL to upload a file to.
 */
export const generateUploadUrl = (
  fileName: string, 
  mimeType: string
): Promise<{ uploadUrl: string; contentId: string; storageKey: string; }> => {
  return fetchFromApi('/content/generate-upload-url', {
    method: 'POST',
    body: JSON.stringify({ fileName, mimeType }),
  });
};

/**
 * NEW: Step 3 of the upload process. Tells the backend that the direct upload is complete.
 */
export const finalizeUpload = (
  payload: { contentId: string; name: string; mimeType: string; size: number; storageKey: string; }
): Promise<ContentAsset> => {
  return fetchFromApi<ContentAsset>('/content/finalize-upload', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};