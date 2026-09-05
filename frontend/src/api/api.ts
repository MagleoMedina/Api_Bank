import { Platform } from 'react-native';

export type BankId = 'bdv' | 'mock';

export interface AccountBalance {
  bankId: string;
  account: string;
  accountType?: string;
  balance: number;
  currency: string;
  fetchedAt: string;
  source: 'cache' | 'live';
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}

const DEFAULT_HOST = Platform.select({
  android: '10.0.2.2',
  default: '127.0.0.1',
});

export const API_BASE_URL = `http://${DEFAULT_HOST}:3000`;

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as
      | Partial<ApiError>
      | undefined;
    throw new Error(body?.message ?? `HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

function toQuery(bank: BankId, account?: string): string {
  const query = new URLSearchParams({ bank });
  if (account) {
    query.set('account', account);
  }
  return query.toString();
}

export function getBalance(
  bank: BankId = 'mock',
  account?: string,
): Promise<AccountBalance> {
  return request<AccountBalance>(`/balance?${toQuery(bank, account)}`);
}

export function refreshBalance(
  bank: BankId = 'mock',
  account?: string,
): Promise<AccountBalance> {
  return request<AccountBalance>(`/balance/refresh?${toQuery(bank, account)}`);
}