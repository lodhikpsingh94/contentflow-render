// src/lib/auth/index.ts

const API_BASE_URL = 'http://localhost:3000/api/v1';

export const login = async (credentials: { email: string, password: string }): Promise<{ token: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': 'tenant1',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    return data;
  } catch (error) {
    console.error('Error during login:', error);
    throw error;
  }
};