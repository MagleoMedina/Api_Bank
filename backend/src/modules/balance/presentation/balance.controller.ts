import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import {
  GetBalanceUseCase,
  type BalanceResult,
} from '../application/get-balance.use-case.js';
import { BalanceQueryDto } from './dto/balance-query.dto.js';
import { BalanceBodyDto } from './dto/balance-body.dto.js';

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

  @Post()
  postBalance(@Body() body: BalanceBodyDto): Promise<BalanceResult> {
    return this.getBalanceUseCase.execute({
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
