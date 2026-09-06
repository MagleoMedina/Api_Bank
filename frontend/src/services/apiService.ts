import { Platform } from 'react-native';

const baseUrl = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : 'http://127.0.0.1:3000';

export const apiService = {
  async post(endpoint: string, body: any) {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }
    return await response.json();
  },

  async get(endpoint: string) {
    const response = await fetch(`${baseUrl}${endpoint}`);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }
    return await response.json();
  },
};
