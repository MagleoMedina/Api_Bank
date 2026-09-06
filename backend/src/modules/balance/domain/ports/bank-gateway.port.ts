import type { AccountBalance } from '../account-balance.entity.js';

export interface BankCredentials {
  user?: string;
  password?: string;
  cedula?: string;
  ci?: string;
}

export interface BankGatewayPort {
  readonly bankId: string;
  getBalance(account?: string, credentials?: BankCredentials): Promise<AccountBalance>;
}
