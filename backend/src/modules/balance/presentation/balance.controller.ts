import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import {
  GetBalanceUseCase,
  type BalanceResult,
} from '../application/get-balance.use-case.js';
import { BalanceQueryDto } from './dto/balance-query.dto.js';
import { BalanceBodyDto } from './dto/balance-body.dto.js';
import { LogService } from '../../../log.service.js';

@Controller('balance')
export class BalanceController {
  constructor(
    private readonly getBalanceUseCase: GetBalanceUseCase,
    private readonly logService: LogService,
  ) {}

  @Get()
  async getBalance(@Query() query: BalanceQueryDto): Promise<BalanceResult> {
    this.logService.log(`GET /balance bank=${query.bank ?? 'mock'}`, 'BalanceController');
    const result = await this.getBalanceUseCase.execute({
      bankId: query.bank,
      account: query.account,
      forceRefresh: false,
    });
    this.logService.log(`→ ${result.bankId} saldo=${result.balance} ${result.currency}`, 'BalanceController');
    return result;
  }

  @Post()
  async postBalance(@Body() body: BalanceBodyDto): Promise<BalanceResult> {
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
    this.logService.log(`→ ${result.bankId} saldo=${result.balance} ${result.currency}`, 'BalanceController');
    return result;
  }

  @Get('refresh')
  async refresh(@Query() query: BalanceQueryDto): Promise<BalanceResult> {
    this.logService.log(`GET /balance/refresh bank=${query.bank ?? 'mock'}`, 'BalanceController');
    const result = await this.getBalanceUseCase.execute({
      bankId: query.bank,
      account: query.account,
      forceRefresh: true,
    });
    this.logService.log(`→ ${result.bankId} saldo=${result.balance} ${result.currency} (refresh)`, 'BalanceController');
    return result;
  }
}
