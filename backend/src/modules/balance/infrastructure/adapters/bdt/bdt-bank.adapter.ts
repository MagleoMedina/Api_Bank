import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium, type Page } from 'playwright';
import type { AccountBalance } from '../../../domain/account-balance.entity.js';
import type { BankGatewayPort } from '../../../domain/ports/bank-gateway.port.js';
import { BankCredentialsMissingException } from '../../../domain/exceptions/bank-credentials-missing.exception.js';
import { BankLoginFailedException } from '../../../domain/exceptions/bank-login-failed.exception.js';
import { BDT_SELECTORS } from './bdt.selectors.js';

const VES_PATTERN = /\b\d{1,3}(?:\.\d{3})+(?:,\d{2})?\b|\b\d+,\d{2}\b/;

@Injectable()
export class BdtBankAdapter implements BankGatewayPort {
  readonly bankId = 'bdt';
  private readonly logger = new Logger(BdtBankAdapter.name);
  private inflight: Promise<AccountBalance> | null = null;

  constructor(private readonly configService: ConfigService) {}

  getBalance(): Promise<AccountBalance> {
    if (this.inflight) {
      return this.inflight;
    }
    this.inflight = this.fetchBalance().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async fetchBalance(): Promise<AccountBalance> {
    const credentials = this.configService.get('bankCredentials.bdt');
    if (!credentials?.cedula || !credentials?.password) {
      throw new BankCredentialsMissingException(this.bankId);
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await this.scrapeOnce();
      } catch (error) {
        lastError = error;
        if (attempt === 1) {
          this.logger.warn(
            `Intento ${attempt} de scraping BDT falló: ${error instanceof Error ? error.message : String(error)}. Reintentando...`,
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

  private async scrapeOnce(): Promise<AccountBalance> {
    const headless = Boolean(this.configService.get<boolean>('headless'));
    const browser = await chromium.launch({ headless, args: ['--no-sandbox', '--disable-setuid-sandbox'], slowMo: 0 });

    try {
      const page = await browser.newPage();
      const credentials = this.configService.get('bankCredentials.bdt');
      await this.login(page, credentials.cedula, credentials.password);
      await this.gotoDashboard(page);

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

  private async login(page: Page, cedula: string, password: string): Promise<void> {
    this.logger.log('Iniciando sesión en BDT Online');

    await page.route('**/*disabled-devtool*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: '// blocked',
      }),
    );

    await page.goto(this.loginUrl(), {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });

    // Step 1: Enter cedula
    const docInput = page.locator(BDT_SELECTORS.docInput).first();
    await docInput.waitFor({ state: 'visible', timeout: 60_000 });

    const docType = page.locator(BDT_SELECTORS.docTypeSelect).first();
    await docType.selectOption('01');

    await docInput.click();
    await docInput.pressSequentially(cedula, { delay: 30 });
    await docInput.dispatchEvent('input');

    await page.evaluate(() => {
      const btn = document.getElementById('cmdLogin');
      btn?.removeAttribute('disabled');
      btn?.click();
    });
    this.logger.log('Paso 1 enviado (cédula)');

    // Step 2: Enter password
    const passwordInput = page.locator(BDT_SELECTORS.passwordInput).first();
    await passwordInput.waitFor({ state: 'visible', timeout: 30_000 });

    await passwordInput.click();
    await passwordInput.pressSequentially(password, { delay: 30 });
    await passwordInput.dispatchEvent('input');

    await page.evaluate(() => {
      const btn = document.getElementById('cmdLogin');
      btn?.removeAttribute('disabled');
      btn?.click();
    });
    this.logger.log('Paso 2 enviado (contraseña)');
  }

  private async gotoDashboard(page: Page): Promise<void> {
    this.logger.log('Esperando el dashboard de BDT');
    try {
      await page.locator(BDT_SELECTORS.dashboardSection).first().waitFor({
        state: 'visible',
        timeout: 90_000,
      });
    } catch {
      const url = page.url();
      const stillOnLogin =
        (await page.locator(BDT_SELECTORS.loginForm).count().catch(() => 0)) > 0;
      await page.screenshot({ path: 'bdt-timeout.png', fullPage: true }).catch(() => undefined);
      this.logger.warn(
        `Dashboard BDT no disponible. url=${url} revertedLogin=${stillOnLogin}`,
      );
      throw new BankLoginFailedException(
        this.bankId,
        stillOnLogin
          ? 'El portal rechazó las credenciales (aún en la pantalla de login).'
          : 'No se encontró el saldo tras el login.',
      );
    }
  }

  private async readBalance(page: Page): Promise<AccountBalance> {
    const body = await page.locator('body').innerText().catch(() => '');
    const match = VES_PATTERN.exec(body);
    const balance = match
      ? Number.parseFloat(match[0].replace(/\./g, '').replace(',', '.'))
      : 0;

    return {
      bankId: this.bankId,
      account: 'POSICIÓN GLOBAL',
      accountType: 'global',
      balance,
      currency: 'VES',
      fetchedAt: new Date(),
    };
  }

  private async logout(page: Page): Promise<void> {
    this.logger.log('Cerrando sesión en BDT Online');
    const acceptDialogs = (dialog: { accept: () => Promise<void> }): void => {
      void dialog.accept();
    };
    page.on('dialog', acceptDialogs);
    try {
      const logoutLink = page.locator(BDT_SELECTORS.logoutLink).first();
      if (await logoutLink.count()) {
        await logoutLink
          .click()
          .catch(async () => logoutLink.evaluate((el) => (el as HTMLElement).click()));
      }
      await page.waitForURL(new RegExp(BDT_SELECTORS.logoutUrl), {
        timeout: 30_000,
      });
      this.logger.log('Sesión BDT cerrada (logout confirmado)');
    } finally {
      page.off('dialog', acceptDialogs);
    }
  }

  private loginUrl(): string {
    return (
      this.configService.get<string>('bankCredentials.bdt.url') ??
      'https://bdtenlinea.bdt.com.ve/?p=1'
    );
  }
}
