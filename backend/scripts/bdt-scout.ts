/**
 * Scout de BDT Online (Banco del Tesoro).
 *
 * Abre el portal en un navegador visible, intenta el login automático
 * (cédula y contraseña) y, cuando estés dentro del portal, captura
 * el HTML posterior al login y sugiere selectores para bdt.selectors.ts.
 *
 * Uso:
 *   npm run scout:bdt
 *
 * Requiere haber ejecutado: npx playwright install chromium
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright';

const BASE_SELECTORS_URL = '../src/modules/balance/infrastructure/adapters/bdt/bdt.selectors.ts';
const OUT_DIR = fileURLToPath(new URL('./out/', import.meta.url));
const START_URL = process.env.BDT_URL ?? 'https://bdtenlinea.bdt.com.ve/?p=1';

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
  const cedula = process.env.BDT_CEDULA ?? '';
  const password = process.env.BDT_PASSWORD ?? '';
  if (!cedula) {
    console.log('BDT_CEDULA/BDT_PASSWORD vacías en .env: login manual.');
    return;
  }

  const docInput = page.locator('#documento').first();
  await docInput.waitFor({ timeout: 30_000 });
  await docInput.fill(cedula);

  const tipodoc = page.locator('#tipodocben').first();
  await tipodoc.selectOption('01');

  const cmdLogin = page.locator('#cmdLogin').first();
  await cmdLogin.click().catch(async () => cmdLogin.evaluate((el: HTMLElement) => el.click()));
  console.log('Cédula enviada. Si aparece paso de contraseña, complétalo manualmente.');

  if (password) {
    await page.waitForTimeout(2_500);
    const cmdStill = await cmdLogin.count();
    if (cmdStill > 0) {
      await docInput.fill(password);
      await cmdLogin.click().catch(async () => cmdLogin.evaluate((el: HTMLElement) => el.click()));
      console.log('Contraseña enviada.');
    }
  }
}

async function main(): Promise<void> {
  ensureOutDir();

  console.log(`Abriendo ${START_URL} (navegador visible)...`);
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(START_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  await attemptAutoLogin(page);

  await pressEnter('Si aparece OTP/captcha o un paso de contraseña, complétalo en el navegador. Presiona Enter cuando estés DENTRO del portal (dashboard con el saldo visible).');

  const html = await page.content();
  writeFileSync(join(OUT_DIR, 'bdt-after-login.html'), html);
  await page.screenshot({ path: join(OUT_DIR, 'bdt-after-login.png'), fullPage: true });

  const text = await page.locator('body').innerText();
  writeFileSync(join(OUT_DIR, 'bdt-after-login.txt'), text);

  console.log('\n=== POSIBLES SALDOS DETECTADOS ===');
  const SALDO_NUMBER = /\b\d{1,3}(?:\.\d{3})+(?:,\d{2})?\b|\b\d+,\d{2}\b/g;
  const balances = text.split('\n').filter((line) => SALDO_NUMBER.test(line));
  balances.slice(0, 30).forEach((line) => console.log(`  ${line.trim()}`));

  console.log('\n=== ELEMENTOS CARGADOS (inputs/buttons con name/id) ===');
  const fields = await page
    .locator('input[name], input[id], button[id], select[id], a[id]')
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
  console.log('Inspecciona el HTML guardado (bdt-after-login.html) para elegir el selector del saldo.');
  console.log(`HTML guardado en: ${join(OUT_DIR, 'bdt-after-login.html')}`);

  console.log(`\nSiguiente paso: edita ${BASE_SELECTORS_URL} con los selectores reales.`);
  await pressEnter('Cierra el navegador.');
  await browser.close();
}

main().catch((error) => {
  console.error('Error en el scout:', error);
  process.exitCode = 1;
});