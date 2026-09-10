import { API_BASE_URL } from '../config/api';

export type BankId = 'bfc' | 'bdt' | 'bdv' | 'bnc' | 'mock' | 'vol';

export interface AccountBalance {
  bankId: string;
  account: string;
  accountType?: string;
  balance: number;
  currency: string;
  fetchedAt: string;
  source: 'cache' | 'live';
  userName?: string;
  balanceUsd?: number;
  usdRate?: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}

const REQUEST_TIMEOUT_MS = 180_000;

export { API_BASE_URL };

async function request<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      signal: controller.signal,
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw new Error('La solicitud tardó demasiado. Inténtalo de nuevo.');
    }
    throw new Error('No se pudo conectar con el servidor.');
  } finally {
    clearTimeout(timeoutId);
  }

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
