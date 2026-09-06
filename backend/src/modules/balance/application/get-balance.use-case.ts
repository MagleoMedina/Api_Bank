import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AccountBalance } from '../domain/account-balance.entity.js';
import type { BalanceCachePort } from '../domain/ports/balance-cache.port.js';
import { BALANCE_CACHE_TOKEN } from '../domain/ports/balance-cache.port.js';
import { BankGatewayRegistry } from './bank-gateway.registry.js';

export interface GetBalanceInput {
  bankId?: string;
  account?: string;
  forceRefresh?: boolean;
  credentials?: {
    user?: string;
    password?: string;
    cedula?: string;
    ci?: string;
    card?: string;
  };
}

export interface BalanceResult extends AccountBalance {
  source: 'cache' | 'live';
}

@Injectable()
export class GetBalanceUseCase {
  constructor(
    private readonly registry: BankGatewayRegistry,
    @Inject(BALANCE_CACHE_TOKEN) private readonly cache: BalanceCachePort,
    private readonly configService: ConfigService,
  ) {}

  async execute(input: GetBalanceInput): Promise<BalanceResult> {
    const configuredBank = this.configService.get<string>('defaultBank') ?? 'mock';
    const bankId = input.bankId?.trim() || configuredBank;
    const cacheKey = `${bankId}:${input.account ?? '*'}`;

    if (!input.forceRefresh) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { ...cached, source: 'cache' };
      }
    }

    const gateway = this.registry.resolve(bankId);
    const balance = await gateway.getBalance(input.account, input.credentials);

    const ttl = this.configService.get<number>('cacheTtlMs') ?? 300_000;
    await this.cache.set(cacheKey, balance, ttl);

    return { ...balance, source: 'live' };
  }
}