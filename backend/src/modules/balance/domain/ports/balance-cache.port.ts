import type { AccountBalance } from '../account-balance.entity.js';

export const BALANCE_CACHE_TOKEN = Symbol('BALANCE_CACHE');

export interface BalanceCachePort {
  get(key: string): Promise<AccountBalance | null>;
  set(key: string, value: AccountBalance, ttlMs: number): Promise<void>;
}