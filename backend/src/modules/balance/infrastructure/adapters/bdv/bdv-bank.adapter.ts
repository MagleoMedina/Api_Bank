import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium, type Page } from 'playwright';
import type { AccountBalance } from '../../../domain/account-balance.entity.js';
import type { BankGatewayPort } from '../../../domain/ports/bank-gateway.port.js';
import { BankCredentialsMissingException } from '../../../domain/exceptions/bank-credentials-missing.exception.js';
import { BankLoginFailedException } from '../../../domain/exceptions/bank-login-failed.exception.js';
import { BDV_SELECTORS } from './bdv.selectors.js';

@Injectable()
export class BdvBankAdapter implements BankGatewayPort {
  readonly bankId = 'bdv';
  private readonly logger = new Logger(BdvBankAdapter.name);
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
    const credentials = this.configService.get('bankCredentials.bdv');
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
            `Intento ${attempt} de scraping BDV falló: ${error instanceof Error ? error.message : String(error)}. Reintentando...`,
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
      const credentials = this.configService.get('bankCredentials.bdv');
      await this.login(page, credentials.user, credentials.password);
      await this.gotoConsolidated(page);

      let balance: AccountBalance;
      try {
        balance = await this.readBalance(page);
      } finally {
        // El scraping llegó a la zona autenticada: SIEMPRE cerrar la sesión
        // para que el token de BDV muera y no quede una "sesión activa"
        // bloqueando el siguiente login.
        await this.logout(page).catch(() => undefined);
      }
      return balance;
    } finally {
      await browser.close().catch(() => undefined);
    }
  }

  private async logout(page: Page): Promise<void> {
    this.logger.log('Cerrando sesión en BDV');
    const acceptDialogs = (dialog: { accept: () => Promise<void> }): void => {
      void dialog.accept();
    };
    page.once('dialog', acceptDialogs);
    try {
      const salir = page.locator(BDV_SELECTORS.logoutButton).first();
      if (await salir.count()) {
        await salir
          .click()
          .catch(async () => salir.evaluate((el) => (el as HTMLElement).click()));
      }
      // La sesión termina cuando el portal navega a /logoff ("Tu sesión
      // finalizó exitosamente"). Espera por hook: sin tiempo fijo.
      const logoffRegex = new RegExp(`${BDV_SELECTORS.logoutUrl.replaceAll('/', '\\/')}$`);
      await page.waitForURL(logoffRegex, { timeout: 30_000 });
      this.logger.log('Sesión BDV cerrada (logoff confirmado)');
    } finally {
      page.off('dialog', acceptDialogs);
    }
  }

  private async login(page: Page, user: string, password: string): Promise<void> {
    this.logger.log(`Iniciando sesión en BDV (usuario: ${user})`);
    await page.goto(this.loginUrl(), {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });

    // Paso 1: usuario + botón "Entrar". El SPA pasa a la pantalla de
    // contraseña sin cambiar la URL, por eso esperamos el campo password.
    const userInput = page.locator(BDV_SELECTORS.usernameInput).first();
    await userInput.waitFor({ state: 'attached', timeout: 60_000 });
    await userInput.fill(user);
    const step1 = page.locator(BDV_SELECTORS.step1Submit).first();
    await step1.click().catch(async () => step1.evaluate((el) => (el as HTMLElement).click()));

    const passwordInput = page.locator(BDV_SELECTORS.passwordInput).first();
    await passwordInput.waitFor({ state: 'attached', timeout: 60_000 });
    await passwordInput.fill(password);

    // Paso 2: botón "Continuar". El login es una navegación real; la espera de
    // la tabla de saldos en gotoConsolidated verifica el resultado.
    const continuar = page
      .locator(BDV_SELECTORS.step2Submit, { hasText: /Continuar/i })
      .first();
    await continuar
      .click()
      .catch(async () => continuar.evaluate((el) => (el as HTMLElement).click()));
  }

  private async gotoConsolidated(page: Page): Promise<void> {
    this.logger.log('Esperando Posición Consolidada');
    try {
      await page
        .locator(BDV_SELECTORS.balanceTable)
        .first()
        .waitFor({ timeout: 90_000 });
    } catch {
      const url = page.url();
      const backOnLogin =
        (await page.locator(BDV_SELECTORS.loginError).isVisible().catch(() => false)) ||
        ((await page.locator(BDV_SELECTORS.usernameInput).count().catch(() => 0)) > 0 &&
          !url.includes('/main/'));
      const count = await page.locator('table').count().catch(() => -1);
      const body = (await page.locator('body').innerText().catch(() => ''))
        .replace(/\s+/g, ' ')
        .slice(0, 400);
      await page.screenshot({ path: 'bdv-timeout.png', fullPage: true }).catch(() => undefined);
      this.logger.warn(`Posición Consolidada no disponible. url=${url} tablas=${count} revertedLogin=${backOnLogin} body=${body}`);
      throw new BankLoginFailedException(
        this.bankId,
        backOnLogin
          ? 'El portal rechazó las credenciales y volvió a la pantalla de inicio.'
          : 'No se encontró la tabla de saldos tras el login.',
      );
    }
  }

  private async readBalance(page: Page): Promise<AccountBalance> {
    const table = page.locator(BDV_SELECTORS.balanceTable).first();
    const row = table.locator(BDV_SELECTORS.balanceRow).first();

    // Extraer número de cuenta (mostrado enmascarado: 0102***9501)
    const accountText = await row
      .locator(BDV_SELECTORS.accountCell)
      .first()
      .textContent()
      .catch(() => '');
    const maskedAccount = accountText?.trim() || 'no-disponible';

    // Clic en el icono OJO (2º mat-icon) para abrir el modal de saldo
    const icons = row.locator(BDV_SELECTORS.eyeIcon);
    await icons.nth(1).click().catch(() => undefined);

    // El saldo disponible aparece en el modal "Consulta saldo en línea",
    // en la última celda con clase .saldo (diferido, disponible)
    let balanceValue = 0;
    try {
      const modal = page.locator(BDV_SELECTORS.balanceModal).first();
      await modal.waitFor({ state: 'visible', timeout: 30_000 });
      const saldoCells = modal.locator(BDV_SELECTORS.modalSaldoCells);
      const cellCount = await saldoCells.count();
      if (cellCount > 0) {
        const cellText = (await saldoCells.nth(cellCount - 1).textContent().catch(() => '')) ?? '';
        const amount = cellText.match(/[\d.,]+\s*Bs\.?/)?.[0];
        if (amount) {
          balanceValue = this.toNumber(amount.replace(/\s*Bs\.?/i, '').trim());
        }
      }
    } catch {
      // El modal no abrió; se devuelve balance 0 con la cuenta detectada
    }

    return {
      bankId: this.bankId,
      account: maskedAccount,
      balance: balanceValue,
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
      this.configService.get<string>('bankCredentials.bdv.url') ??
      'https://bdvenlinea.banvenez.com/'
    );
  }
}