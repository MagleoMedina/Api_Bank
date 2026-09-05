/**
 * Scout de BNCNET Personas (Banco Nacional de Crédito).
 *
 * Abre el portal en un navegador visible, intenta el login automático de dos
 * pasos (tarjeta + cédula → contraseña) y, cuando estés dentro del portal,
 * captura el HTML posterior al login y sugiere selectores para
 * bnc.selectors.ts.
 *
 * Uso:
 *   npm run scout:bnc
 *
 * Requiere haber ejecutado: npx playwright install chromium
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright';

const BASE_SELECTORS_URL = '../src/modules/balance/infrastructure/adapters/bnc/bnc.selectors.ts';
const OUT_DIR = fileURLToPath(new URL('./out/', import.meta.url));
const START_URL = process.env.BNC_URL ?? 'https://personas.bncenlinea.com/';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const pressEnter = (msg: string): Promise<void> =>
  new Promise((resolve) => {
    rl.question(`${msg}\n[Enter] continuar... `, () => resolve());
  });

function ensureOutDir(): void {
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }
}

async function attemptAutoLogin(page: Page): Promise<void> {
  const card = process.env.BNC_CARD ?? '';
  const ci = process.env.BNC_CI ?? '';
  const password = process.env.BNC_PASSWORD ?? '';
  if (!card || !ci || !password) {
    console.log('BNC_CARD/BNC_CI/BNC_PASSWORD vacías en .env: login manual.');
    return;
  }

  // Paso 1: tarjeta + cédula en #Frm_PreLogin (form "Personas", Débito|Crédito)
  const cardInput = page.locator('#CardNumber').first();
  await cardInput.waitFor({ timeout: 30_000 });
  await cardInput.fill(card);
  const ciInput = page.locator('#UserID').first();
  await ciInput.fill(ci);

  const btnSend = page.locator('#BtnSend').first();
  if (btnSend) {
    await btnSend
      .click()
      .catch(async () => btnSend.evaluate((el: HTMLElement) => el.click()));
    console.log('Paso 1 enviado (Continuar). Esperando pantalla de contraseña...');
  }

  // Paso 2: input de contraseña (la pantalla se carga vía navegación del form)
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ timeout: 45_000 });
  await passwordInput.fill(password);

  const form = page.locator('form').filter({ has: passwordInput }).first();
  const submit = form
    .locator('button[type="submit"], input[type="submit"]')
    .first();
  if (await submit.count()) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load', timeout: 45_000 }).catch(() => undefined),
      submit.click().catch(async () => submit.evaluate((el: HTMLElement) => el.click())),
    ]);
  }
  console.log('Login en dos pasos enviado. Si hay OTP/captcha, complétalo manualmente.');
}

async function main(): Promise<void> {
  ensureOutDir();

  console.log(`Abriendo ${START_URL} (navegador visible)...`);
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(START_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  await attemptAutoLogin(page);

  await pressEnter('Si apareció OTP/captcha, complétala en el navegador. Presiona Enter cuando estés DENTRO del portal (dashboard con el saldo visible).');

  const html = await page.content();
  writeFileSync(join(OUT_DIR, 'bnc-after-login.html'), html);
  await page.screenshot({ path: join(OUT_DIR, 'bnc-after-login.png'), fullPage: true });

  const text = await page.locator('body').innerText();
  writeFileSync(join(OUT_DIR, 'bnc-after-login.txt'), text);

  console.log('\n=== POSIBLES SALDOS DETECTADOS ===');
  const balances = text.split('\n').filter((line) => /\d{1,3}(?:\.\d{3})*(?:,\d{2})|^\d+,?\d{2}$/.test(line));
  balances.slice(0, 30).forEach((line) => console.log(`  ${line.trim()}`));

  console.log('\n=== ELEMENTOS CARGADOS (inputs/buttons con name/id) ===');
  const fields = await page
    .locator('input[name], input[id], button[id], a[id]')
    .evaluateAll((els) =>
      els.map((el) => ({
        tag: el.tagName.toLowerCase(),
        name: el.getAttribute('name'),
        id: el.id,
        type: el.getAttribute('type'),
        text: el.textContent?.trim().slice(0, 40),
      })),
    );
  console.log(JSON.stringify(fields.slice(0, 30), null, 2));

  console.log('\n=== CANDIDATO PARA balanceContainer ===');
  console.log('Inspecciona el HTML guardado (bnc-after-login.html) para elegir el selector del saldo.');
  console.log(`HTML guardado en: ${join(OUT_DIR, 'bnc-after-login.html')}`);

  console.log(`\nSiguiente paso: edita ${BASE_SELECTORS_URL} con los selectores reales.`);
  await pressEnter('Cierra el navegador.');
  await browser.close();
}

main().catch((error) => {
  console.error('Error en el scout:', error);
  process.exitCode = 1;
});