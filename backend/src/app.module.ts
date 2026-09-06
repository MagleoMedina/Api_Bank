import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration.js';
import { HealthController } from './health.controller.js';
import { BalanceModule } from './modules/balance/balance.module.js';
import { BankExceptionFilter } from './modules/balance/presentation/filters/bank-exception.filter.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    BalanceModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: BankExceptionFilter }],
})
export class AppModule {}