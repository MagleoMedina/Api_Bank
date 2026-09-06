import { Injectable } from '@nestjs/common';
import type { AccountBalance } from '../../../domain/account-balance.entity.js';
import type { BankCredentials, BankGatewayPort } from '../../../domain/ports/bank-gateway.port.js';

@Injectable()
export class MockBankAdapter implements BankGatewayPort {
  readonly bankId = 'mock';

  async getBalance(account?: string, _credentials?: BankCredentials): Promise<AccountBalance> {
    return {
      bankId: this.bankId,
      account: account ?? '01020530750000123456',
      accountType: 'corriente',
      balance: Math.round((1000 + Math.random() * 9000) * 100) / 100,
      currency: 'VES',
      fetchedAt: new Date(),
    };
  }
}