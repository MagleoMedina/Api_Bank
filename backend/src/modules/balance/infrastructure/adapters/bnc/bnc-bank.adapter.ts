import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium, type Page } from 'playwright';
import type { AccountBalance } from '../../../domain/account-balance.entity.js';
import type { BankGatewayPort } from '../../../domain/ports/bank-gateway.port.js';
import { BankCredentialsMissingException } from '../../../domain/exceptions/bank-credentials-missing.exception.js';
import { BankLoginFailedException } from '../../../domain/exceptions/bank-login-failed.exception.js';
import { BNC_SELECTORS } from './bnc.selectors.js';

@Injectable()
export class BncBankAdapter implements BankGatewayPort {
  readonly bankId = 'bnc';
  private readonly logger = new Logger(BncBankAdapter.name);
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
    const credentials = this.configService.get('bankCredentials.bnc');
    if (!credentials?.card || !credentials?.ci || !credentials?.password) {
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
            `Intento ${attempt} de scraping BNC falló: ${error instanceof Error ? error.message : String(error)}. Reintentando...`,
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
    const browser = await chromium.launch({ headless });

    try {
      const page = await browser.newPage();
      const credentials = this.configService.get('bankCredentials.bnc');
      await this.login(page, credentials.card, credentials.ci, credentials.password);
      await this.gotoDashboard(page);

      let balance: AccountBalance;
      try {
        balance = await this.readBalance(page);
      } finally {
        // El scraping llegó a la zona autenticada: SIEMPRE cerrar la sesión
        // para que el token de BNC muera y no quede una "sesión activa".
        await this.logout(page).catch(() => undefined);
      }
      return balance;
    } finally {
      await browser.close().catch(() => undefined);
    }
  }

  private async logout(page: Page): Promise<void> {
    this.logger.log('Cerrando sesión en BNC');
    const acceptDialogs = (dialog: { accept: () => Promise<void> }): void => {
      void dialog.accept();
    };
    page.once('dialog', acceptDialogs);
    try {
      const salir = page.locator(BNC_SELECTORS.logoutButton).first();
      if (await salir.count()) {
        await salir
          .click()
          .catch(async () => salir.evaluate((el) => (el as HTMLElement).click()));
      }
      // La sesión termina cuando el portal navega a /Auth/LogOut ("Sesión
      // Finalizada"). Espera por hook: sin tiempo fijo.
      const logoffRegex = new RegExp(
        `${BNC_SELECTORS.logoutUrl.replaceAll('/', '\\/')}$`,
      );
      await page.waitForURL(logoffRegex, { timeout: 30_000 });
      this.logger.log('Sesión BNC cerrada (LogOut confirmado)');
    } finally {
      page.off('dialog', acceptDialogs);
    }
  }

  private async login(
    page: Page,
    card: string,
    ci: string,
    password: string,
  ): Promise<void> {
    const maskedCard = card.slice(0, 6) + '***' + card.slice(-4);
    this.logger.log(`Iniciando sesión en BNC (tarjeta: ${maskedCard})`);
    await page.goto(this.loginUrl(), {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });

    // Paso 1: tarjeta + cédula. "Continuar" dispara el POST AJAX
    // /Auth/PreLogin_Try que reemplaza #FormContainer con el paso 2.
    const cardInput = page.locator(BNC_SELECTORS.cardInput).first();
    await cardInput.waitFor({ state: 'attached', timeout: 60_000 });
    await cardInput.fill(card);
    const ciInput = page.locator(BNC_SELECTORS.ciInput).first();
    await ciInput.fill(ci);

    const continuar = page.locator(BNC_SELECTORS.loginSubmit).first();
    await continuar
      .click()
      .catch(async () => continuar.evaluate((el) => (el as HTMLElement).click()));

    // Paso 2: contraseña. El envío dispara /Auth/Login_Try; en el caso normal
    // el portal navega al dashboard (verificado en gotoDashboard).
    const passwordInput = page.locator(BNC_SELECTORS.passwordInput).first();
    await passwordInput.waitFor({ state: 'attached', timeout: 60_000 });
    await passwordInput.fill(password);

    const submit = page.locator(BNC_SELECTORS.passwordSubmit).first();
    await submit
      .click()
      .catch(async () => submit.evaluate((el) => (el as HTMLElement).click()));
  }

  private async gotoDashboard(page: Page): Promise<void> {
    this.logger.log('Esperando el dashboard de BNC');
    try {
      await page
        .locator(BNC_SELECTORS.balanceBoxVes)
        .first()
        .waitFor({ state: 'visible', timeout: 90_000 });
    } catch {
      const url = page.url();
      const backOnLogin =
        (await page.locator(BNC_SELECTORS.passwordForm).count().catch(() => 0)) > 0 ||
        (await page.locator(BNC_SELECTORS.loginForm).count().catch(() => 0)) > 0;
      const errorMsg = (
        (await page.locator(BNC_SELECTORS.loginError).textContent().catch(() => '')) ?? ''
      )
        .trim()
        .slice(0, 160);
      const body = (await page.locator('body').innerText().catch(() => ''))
        .replace(/\s+/g, ' ')
        .slice(0, 400);
      await page.screenshot({ path: 'bnc-timeout.png', fullPage: true }).catch(() => undefined);
      this.logger.warn(
        `Dashboard BNC no disponible. url=${url} revertedLogin=${backOnLogin} error="${errorMsg}" body=${body}`,
      );
      throw new BankLoginFailedException(
        this.bankId,
        backOnLogin
          ? `El portal rechazó las credenciales (aún en fase de login). ${errorMsg}`.trim()
          : 'No se encontró el saldo tras el login.',
      );
    }
  }

  private async readBalance(page: Page): Promise<AccountBalance> {
    const box = page.locator(BNC_SELECTORS.balanceBoxVes).first();

    const product =
      (await box
        .locator(BNC_SELECTORS.balanceProductLabel)
        .first()
        .textContent()
        .catch(() => '')) ?? '';
    const label = product.trim() || 'Depósitos a la Vista (Bs.)';

    const valueText =
      (await box
        .locator(BNC_SELECTORS.balanceValue)
        .first()
        .textContent()
        .catch(() => '')) ?? '';

    return {
      bankId: this.bankId,
      account: label,
      accountType: 'vista',
      balance: this.toNumber(valueText),
      currency: 'VES',
      fetchedAt: new Date(),
    };
  }

  private toNumber(value: string): number {
    const normalized = value.replace(/\./g, '').replace(',', '.');
    return Number.parseFloat(normalized);
  }

  private loginUrl(): string {
    return (
      this.configService.get<string>('bankCredentials.bnc.url') ??
      'https://personas.bncenlinea.com/'
    );
  }
}