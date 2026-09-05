import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium, type Page } from 'playwright';
import type { AccountBalance } from '../../../domain/account-balance.entity.js';
import type { BankGatewayPort } from '../../../domain/ports/bank-gateway.port.js';
import { BankCredentialsMissingException } from '../../../domain/exceptions/bank-credentials-missing.exception.js';
import { BankLoginFailedException } from '../../../domain/exceptions/bank-login-failed.exception.js';
import { VOL_SELECTORS } from './vol.selectors.js';

@Injectable()
export class VolBankAdapter implements BankGatewayPort {
  readonly bankId = 'vol';
  private readonly logger = new Logger(VolBankAdapter.name);
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
    const credentials = this.configService.get('bankCredentials.vol');
    if (!credentials?.user || !credentials?.password) {
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
            `Intento ${attempt} de scraping VOL falló: ${error instanceof Error ? error.message : String(error)}. Reintentando...`,
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
      const credentials = this.configService.get('bankCredentials.vol');
      await this.login(page, credentials.user, credentials.password);
      await this.gotoDashboard(page);

      let balance: AccountBalance;
      try {
        balance = await this.readBalance(page);
      } finally {
        // El scraping llegó a la zona autenticada: SIEMPRE cerrar la sesión
        // para que la sesión de VolOnline muera y no quede "sesión activa".
        await this.logout(page).catch(() => undefined);
      }
      return balance;
    } finally {
      await browser.close().catch(() => undefined);
    }
  }

  private async logout(page: Page): Promise<void> {
    this.logger.log('Cerrando sesión en VolOnline');
    const acceptDialogs = (dialog: { accept: () => Promise<void> }): void => {
      void dialog.accept();
    };
    page.on('dialog', acceptDialogs);
    try {
      const salir = page.locator(VOL_SELECTORS.logoutLink).first();
      if (await salir.count()) {
        await salir
          .click()
          .catch(async () => salir.evaluate((el) => (el as HTMLElement).click()));
      }
      // salir() POSTea #formMenu a vc540.do (o vc540Movil.do si la cabecera
      // es angosta). La sesión muere al navegar ahí. Espera a cualquiera.
      await page.waitForURL(
        new RegExp(`(${VOL_SELECTORS.logoutWebUrl}|${VOL_SELECTORS.logoutMovilUrl})`),
        { timeout: 30_000 },
      );
      this.logger.log('Sesión VolOnline cerrada (vc540 confirmado)');
    } finally {
      page.off('dialog', acceptDialogs);
    }
  }

  private async login(page: Page, user: string, password: string): Promise<void> {
    this.logger.log('Iniciando sesión en VolOnline');
    await page.goto(this.loginUrl(), {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });

    const form = page.locator(VOL_SELECTORS.loginForm).first();
    await form.waitFor({ state: 'visible', timeout: 60_000 });

    const userInput = page.locator(VOL_SELECTORS.userInput).first();
    await userInput.fill(user);
    const passwordInput = page.locator(VOL_SELECTORS.passwordInput).first();
    await passwordInput.fill(password);

    const submit = page.locator(VOL_SELECTORS.loginSubmit).first();
    await submit
      .click()
      .catch(async () => submit.evaluate((el) => (el as HTMLElement).click()));
  }

  private async gotoDashboard(page: Page): Promise<void> {
    this.logger.log('Navegando a la Consulta Consolidada de VolOnline');
    // Hacemos clic en el enlace "Consulta consolidada" para forzar la navegación
    // al panel de saldos (el portal usa GoIB(...); tras el clic el DOM muestra #RowCuentas).
    try {
      await page.click('a[onclick*="consultaConsolidada"]').catch(() => {});
    } catch {}

    this.logger.log('Esperando la Consulta Consolidada de VolOnline');
    try {
      await page
        .locator(VOL_SELECTORS.cuentaBsSection)
        .first()
        .waitFor({ state: 'visible', timeout: 180_000 });
    } catch {
      const url = page.url();
      const backOnLogin =
        (await page.locator(VOL_SELECTORS.loginForm).count().catch(() => 0)) > 0;
      const errorMsg = (
        (await page.locator(VOL_SELECTORS.loginError).textContent().catch(() => '')) ?? ''
      )
        .trim()
        .slice(0, 160);
      const body = (await page.locator('body').innerText().catch(() => ''))
        .replace(/\s+/g, ' ')
        .slice(0, 400);
      await page.screenshot({ path: 'vol-timeout.png', fullPage: true }).catch(() => undefined);
      this.logger.warn(
        `Consulta Consolidada no disponible. url=${url} revertedLogin=${backOnLogin} error="${errorMsg}" body=${body}`,
      );
      throw new BankLoginFailedException(
        this.bankId,
        backOnLogin
          ? `El portal rechazó las credenciales (aún en la pantalla de login). ${errorMsg}`.trim()
          : 'No se encontró el saldo tras el login.',
      );
    }
  }

  private async readBalance(page: Page): Promise<AccountBalance> {
    const header = page.locator(VOL_SELECTORS.cuentaBsHeader).first();

    const label =
      (await header
        .locator(VOL_SELECTORS.cuentaBsLabel)
        .first()
        .textContent()
        .catch(() => '')) ?? '';
    const productName = label.trim() || 'Cuentas en Bolívares';

    const productType =
      (await page
        .locator(VOL_SELECTORS.cuentaBsProductType)
        .first()
        .textContent()
        .catch(() => '')) ?? '';
    const accountType = productType.trim().toLowerCase() || 'corriente';

    const totalText =
      (await header
        .locator(VOL_SELECTORS.cuentaBsTotal)
        .first()
        .textContent()
        .catch(() => '')) ?? '';

    return {
      bankId: this.bankId,
      account: productName,
      accountType,
      balance: this.toNumber(totalText),
      currency: 'VES',
      fetchedAt: new Date(),
    };
  }

  private toNumber(value: string): number {
    const match = /([\d][\d.,]*)/.exec(value);
    if (!match) {
      return 0;
    }
    return Number.parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
  }

  private loginUrl(): string {
    const base =
      this.configService.get<string>('bankCredentials.vol.url') ?? 'https://vol.venezolano.com/';
    return base.endsWith('/') ? base.slice(0, -1) + VOL_SELECTORS.loginUrl : base + VOL_SELECTORS.loginUrl;
  }
}