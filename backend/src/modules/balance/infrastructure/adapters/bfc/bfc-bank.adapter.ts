import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium, type Page } from 'playwright';
import type { AccountBalance } from '../../../domain/account-balance.entity.js';
import type { BankCredentials, BankGatewayPort } from '../../../domain/ports/bank-gateway.port.js';
import { BankCredentialsMissingException } from '../../../domain/exceptions/bank-credentials-missing.exception.js';
import { BankLoginFailedException } from '../../../domain/exceptions/bank-login-failed.exception.js';

@Injectable()
export class BfcBankAdapter implements BankGatewayPort {
  readonly bankId = 'bfc';
  private readonly logger = new Logger(BfcBankAdapter.name);
  private inflight: Promise<AccountBalance> | null = null;

  constructor(private readonly configService: ConfigService) {}

  getBalance(_account?: string, credentials?: BankCredentials): Promise<AccountBalance> {
    if (this.inflight) {
      return this.inflight;
    }
    this.inflight = this.fetchBalance(credentials).finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async fetchBalance(credentials?: BankCredentials): Promise<AccountBalance> {
    const creds = credentials?.user
      ? credentials
      : this.configService.get('bankCredentials.bfc');
    if (!creds?.user || !creds.password) {
      throw new BankCredentialsMissingException(this.bankId);
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await this.scrapeOnce(credentials);
      } catch (error) {
        lastError = error;
        if (attempt === 1) {
          this.logger.warn(
            `Intento ${attempt} de scraping BFC falló: ${error instanceof Error ? error.message : String(error)}. Reintentando...`,
          );
        }
      }
    }

    if (lastError instanceof BankLoginFailedException) {
      throw lastError;
    }
    throw new BankLoginFailedException(
      this.bankId,
      lastError instanceof Error ? lastError.message : String(lastError),
    );
  }

  private async scrapeOnce(credentials?: BankCredentials): Promise<AccountBalance> {
    const headless = Boolean(this.configService.get<boolean>('headless'));
    const browser = await chromium.launch({ headless });

    try {
      const page = await browser.newPage();
      const creds = credentials?.user
        ? credentials
        : this.configService.get('bankCredentials.bfc');
      await this.login(page, creds.user, creds.password);

      let balance: AccountBalance;
      try {
        balance = await this.readBalance(page);
      } finally {
        await this.logout(page).catch(() => undefined);
      }
      return balance;
    } finally {
      await browser.close().catch(() => undefined);
    }
  }

  private async login(page: Page, user: string, password: string): Promise<void> {
    this.logger.log('Iniciando sesión en BFC');
    await page.goto(this.loginUrl(), {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });

    const userInput = page.locator('input[name="user"]').first();
    await userInput.waitFor({ state: 'visible', timeout: 60_000 });
    await userInput.fill(user);

    const passInput = page.locator('input[name="password"]').first();
    await passInput.waitFor({ state: 'visible', timeout: 60_000 });
    await passInput.fill(password);

    const submit = page.locator('button[type="submit"]').first();
    await submit.click();
  }

  private async readBalance(page: Page): Promise<AccountBalance> {
    const body = await page.locator('body').innerText().catch(() => '');
    // Buscar patrón de saldo VES
    const vesMatch = body.match(/\b\d{1,3}(?:\.\d{3})+(?:,\d{2})?\b|\b\d+,\d{2}\b/g);
    const balance = vesMatch ? Number.parseFloat(vesMatch[0].replace(/\./g, '').replace(',', '.')) : 0;

    return {
      bankId: this.bankId,
      account: 'Cuenta Comunal',
      accountType: 'global',
      balance,
      currency: 'VES',
      fetchedAt: new Date(),
    };
  }

  private async logout(page: Page): Promise<void> {
    this.logger.log('Cerrando sesión en BFC');
    try {
      await page.goto(this.loginUrl() + '/logout', {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
    } catch {}
  }

  private loginUrl(): string {
    return (
      this.configService.get<string>('bankCredentials.bfc.url') ??
      'https://www20.bfc.com.ve/'
    );
  }
}