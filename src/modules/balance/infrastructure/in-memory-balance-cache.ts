import { Injectable } from '@nestjs/common';
import type { AccountBalance } from '../domain/account-balance.entity.js';
import type { BalanceCachePort } from '../domain/ports/balance-cache.port.js';

interface CacheEntry {
  value: AccountBalance;
  expiresAt: number;
}

@Injectable()
export class InMemoryBalanceCache implements BalanceCachePort {
  private readonly cache = new Map<string, CacheEntry>();

  async get(key: string): Promise<AccountBalance | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: AccountBalance, ttlMs: number): Promise<void> {
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}