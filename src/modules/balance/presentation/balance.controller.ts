import { Controller, Get, Query } from '@nestjs/common';
import {
  GetBalanceUseCase,
  type BalanceResult,
} from '../application/get-balance.use-case.js';
import { BalanceQueryDto } from './dto/balance-query.dto.js';

@Controller('balance')
export class BalanceController {
  constructor(private readonly getBalanceUseCase: GetBalanceUseCase) {}

  @Get()
  getBalance(@Query() query: BalanceQueryDto): Promise<BalanceResult> {
    return this.getBalanceUseCase.execute({
      bankId: query.bank,
      account: query.account,
      forceRefresh: false,
    });
  }

  @Get('refresh')
  refresh(@Query() query: BalanceQueryDto): Promise<BalanceResult> {
    return this.getBalanceUseCase.execute({
      bankId: query.bank,
      account: query.account,
      forceRefresh: true,
    });
  }
}