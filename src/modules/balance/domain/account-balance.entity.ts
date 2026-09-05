export interface AccountBalance {
  bankId: string;
  account: string;
  accountType?: string;
  balance: number;
  currency: string;
  fetchedAt: Date;
}