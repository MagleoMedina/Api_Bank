import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { AccountBalance } from '../domain/account-balance.entity.js';
import type { BalanceCachePort } from '../domain/ports/balance-cache.port.js';
import type { BankGatewayPort } from '../domain/ports/bank-gateway.port.js';
import { BankGatewayRegistry } from './bank-gateway.registry.js';
import { GetBalanceUseCase } from './get-balance.use-case.js';

function makeConfig(): ConfigService {
  return {
    get: (key: string) => (key === 'defaultBank' ? 'mock' : key === 'cacheTtlMs' ? 300_000 : undefined),
  } as unknown as ConfigService;
}

const balance: AccountBalance = {
  bankId: 'mock',
  account: '01020530750000123456',
  accountType: 'corriente',
  balance: 1234.56,
  currency: 'VES',
  fetchedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('GetBalanceUseCase', () => {
  let useCase: GetBalanceUseCase;
  let cache: BalanceCachePort;
  let gateway: BankGatewayPort;

  beforeEach(() => {
    cache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    };
    gateway = {
      bankId: 'mock',
      getBalance: vi.fn().mockResolvedValue(balance),
    };

    const registry = new BankGatewayRegistry([gateway], makeConfig());
    useCase = new GetBalanceUseCase(registry, cache, makeConfig());
  });

  it('hace scraping en vivo cuando el caché está vacío', async () => {
    const result = await useCase.execute({ bankId: 'mock' });

    expect(result).toMatchObject({ ...balance, source: 'live' });
    expect(cache.set).toHaveBeenCalledTimes(1);
  });

  it('responde desde caché cuando hay valor fresco', async () => {
    vi.mocked(cache.get).mockResolvedValue(balance);

    const result = await useCase.execute({ bankId: 'mock' });

    expect(result).toMatchObject({ ...balance, source: 'cache' });
    expect(gateway.getBalance).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('forceRefresh ignora el caché', async () => {
    vi.mocked(cache.get).mockResolvedValue(balance);

    const result = await useCase.execute({ bankId: 'mock', forceRefresh: true });

    expect(result.source).toBe('live');
    expect(gateway.getBalance).toHaveBeenCalledTimes(1);
  });
});