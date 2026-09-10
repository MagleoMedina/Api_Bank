import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import {
  GetBalanceUseCase,
  type BalanceResult,
} from '../application/get-balance.use-case.js';
import { BalanceQueryDto } from './dto/balance-query.dto.js';
import { BalanceBodyDto } from './dto/balance-body.dto.js';
import { LogService } from '../../../log.service.js';
import { ExchangeRateService } from '../../../exchange-rate.service.js';

@Controller('balance')
export class BalanceController {
  constructor(
    private readonly getBalanceUseCase: GetBalanceUseCase,
    private readonly logService: LogService,
    private readonly exchangeRate: ExchangeRateService,
  ) {}

  @Get()
  async getBalance(@Query() query: BalanceQueryDto) {
    this.logService.log(`GET /balance bank=${query.bank ?? 'mock'}`, 'BalanceController');
    const result = await this.getBalanceUseCase.execute({
      bankId: query.bank,
      account: query.account,
      forceRefresh: false,
    });
    const enriched = await this.enrichWithUsd(result);
    this.logService.log(`→ ${result.bankId} saldo=${result.balance} ${result.currency} ($${enriched.balanceUsd} USD)`, 'BalanceController');
    return enriched;
  }

  @Post()
  async postBalance(@Body() body: BalanceBodyDto) {
    this.logService.log(`POST /balance bank=${body.bank} user=${body.user ?? body.cedula ?? body.ci ?? '?'}`, 'BalanceController');
    const result = await this.getBalanceUseCase.execute({
      bankId: body.bank,
      account: body.account,
      forceRefresh: false,
      credentials: {
        user: body.user,
        password: body.password,
        cedula: body.cedula,
        ci: body.ci,
        card: body.card,
      },
    });
    const enriched = await this.enrichWithUsd(result);
    this.logService.log(`→ ${result.bankId} saldo=${result.balance} ${result.currency} ($${enriched.balanceUsd} USD)`, 'BalanceController');
    return enriched;
  }

  @Get('refresh')
  async refresh(@Query() query: BalanceQueryDto) {
    this.logService.log(`GET /balance/refresh bank=${query.bank ?? 'mock'}`, 'BalanceController');
    const result = await this.getBalanceUseCase.execute({
      bankId: query.bank,
      account: query.account,
      forceRefresh: true,
    });
    const enriched = await this.enrichWithUsd(result);
    this.logService.log(`→ ${result.bankId} saldo=${result.balance} ${result.currency} ($${enriched.balanceUsd} USD)`, 'BalanceController');
    return enriched;
  }

  private async enrichWithUsd(result: BalanceResult) {
    const balanceUsd = result.currency === 'VES'
      ? await this.exchangeRate.vesToUsd(result.balance)
      : result.balance;
    const usdRate = result.currency === 'VES'
      ? await this.exchangeRate.getUsdRate()
      : 1;
    return {
      ...result,
      balanceUsd,
      usdRate,
    };
  }
}
