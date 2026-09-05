import { Global, Module } from '@nestjs/common';
import { GetBalanceUseCase } from './application/get-balance.use-case.js';
import { BankGatewayRegistry } from './application/bank-gateway.registry.js';
import { BANK_GATEWAY_TOKEN } from './application/bank-gateway.token.js';
import { BALANCE_CACHE_TOKEN } from './domain/ports/balance-cache.port.js';
import { InMemoryBalanceCache } from './infrastructure/in-memory-balance-cache.js';
import { MockBankAdapter } from './infrastructure/adapters/mock/mock-bank.adapter.js';
import { BdvBankAdapter } from './infrastructure/adapters/bdv/bdv-bank.adapter.js';
import { BncBankAdapter } from './infrastructure/adapters/bnc/bnc-bank.adapter.js';
import { BalanceController } from './presentation/balance.controller.js';

@Global()
@Module({
  controllers: [BalanceController],
  providers: [
    GetBalanceUseCase,
    BankGatewayRegistry,
    MockBankAdapter,
    BdvBankAdapter,
    BncBankAdapter,
    { provide: BALANCE_CACHE_TOKEN, useClass: InMemoryBalanceCache },
    {
      provide: BANK_GATEWAY_TOKEN,
      useFactory: (mock: MockBankAdapter, bdv: BdvBankAdapter, bnc: BncBankAdapter) => [
        mock,
        bdv,
        bnc,
      ],
      inject: [MockBankAdapter, BdvBankAdapter, BncBankAdapter],
    },
  ],
  exports: [GetBalanceUseCase, BankGatewayRegistry],
})
export class BalanceModule {}