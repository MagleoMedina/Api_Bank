import type { AccountBalance } from '../account-balance.entity.js';

export interface BankGatewayPort {
  readonly bankId: string;
  getBalance(account?: string): Promise<AccountBalance>;
}