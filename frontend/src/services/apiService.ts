import { API_BASE_URL } from '../config/api';

export interface BalanceRequest {
  bank: string;
  user?: string;
  password?: string;
  cedula?: string;
  ci?: string;
  card?: string;
  account?: string;
}

export const apiService = {
  async postBalance(body: BalanceRequest) {
    const response = await fetch(`${API_BASE_URL}/balance`, {
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
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }
    return await response.json();
  },
};
