export class BalanceResponseDto {
  bankId!: string;
  account!: string;
  accountType?: string;
  balance!: number;
  currency!: string;
  fetchedAt!: Date;
  source!: 'cache' | 'live';
}