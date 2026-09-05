import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BankNotSupportedException } from '../domain/exceptions/bank-not-supported.exception.js';
import type { BankGatewayPort } from '../domain/ports/bank-gateway.port.js';
import { BANK_GATEWAY_TOKEN } from './bank-gateway.token.js';

@Injectable()
export class BankGatewayRegistry {
  private readonly adapters = new Map<string, BankGatewayPort>();
  private readonly defaultBank: string;

  constructor(
    @Inject(BANK_GATEWAY_TOKEN) adapters: BankGatewayPort[],
    configService: ConfigService,
  ) {
    for (const adapter of adapters) {
      this.adapters.set(adapter.bankId, adapter);
    }
    this.defaultBank = configService.get<string>('defaultBank') ?? 'mock';
  }

  resolve(bankId?: string): BankGatewayPort {
    const id = bankId?.trim() || this.defaultBank;
    const adapter = this.adapters.get(id);
    if (!adapter) {
      throw new BankNotSupportedException(id, [...this.adapters.keys()]);
    }
    return adapter;
  }

  listBanks(): string[] {
    return [...this.adapters.keys()];
  }
}