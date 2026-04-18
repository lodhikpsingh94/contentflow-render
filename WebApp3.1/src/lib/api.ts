// src/lib/api.ts

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000') + '/api/v1';

/**
 * A centralized, authenticated fetch helper for all API calls after login.
 * It automatically includes the JWT and Tenant ID.
 */
export async function fetchFromApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    console.error('No authentication token found.');
    // Redirect to login if the token is missing
    window.location.href = '/'; 
    throw new Error('Authentication token not found. Please log in again.');
  }

  // CORRECTED: Headers must now include Authorization and X-Tenant-Id
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': 'tenant1', // This is hardcoded as per your backend's current logic
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // The backend's global exception filter provides a structured error
    const responseData = await response.json();

    if (!response.ok) {
        // Use the detailed error message from the backend
        const errorMessage = responseData.error?.message || responseData.message || `API request failed with status ${response.status}`;
        
        // Handle session expiry specifically
        if (response.status === 401) {
            localStorage.removeItem('authToken');
            window.location.href = '/';
            throw new Error('Your session has expired. Please log in again.');
        }

        throw new Error(errorMessage);
    }
    
    // The backend wraps successful responses in a `data` object
    return responseData.data as T;

  } catch (error) {
    console.error(`Error fetching from endpoint ${endpoint}:`, error);
    throw error;
  }
}

// Re-exporting all API functions remains the same
export * from './auth';
export * from './analytics';
export * from './campaigns';
export * from './content';
export * from './segments';