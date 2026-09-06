import { apiService } from './apiService';

export interface HealthStatus {
  server: boolean;
  lastCheck: Date | null;
}

let cachedStatus: HealthStatus = {
  server: false,
  lastCheck: null,
};

export async function checkServerHealth(): Promise<HealthStatus> {
  try {
    const result = await apiService.get('/health');
    cachedStatus = {
      server: result.status === 'ok',
      lastCheck: new Date(),
    };
  } catch {
    cachedStatus = {
      server: false,
      lastCheck: new Date(),
    };
  }
  return cachedStatus;
}

export function getCachedHealth(): HealthStatus {
  return cachedStatus;
}
