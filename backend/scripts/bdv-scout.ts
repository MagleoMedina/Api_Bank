/**
 * Scout de BDVenlínea (Banco de Venezuela).
 *
 * Abre el portal en un navegador visible para que puedas completar
 * captcha/validaciones manualmente, captura el HTML posterior al login
 * y sugiere selectores para bdv.selectors.ts.
 *
 * Uso:
 *   node --env-file=.env scripts/bdv-scout.ts
 *   (o: npm run scout:bdv)
 *
 * Requiere haber ejecutado: npx playwright install chromium
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright';

const BASE_SELECTORS_URL = '../src/modules/balance/infrastructure/adapters/bdv/bdv.selectors.ts';
const OUT_DIR = fileURLToPath(new URL('./out/', import.meta.url));

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

async function attemptAutoLogin(page: Page): Promise<boolean> {
  const user = process.env.BDV_USER ?? '';
  const password = process.env.BDV_PASSWORD ?? '';
  if (!user || !password) {
    console.log('BDV_USER/BDV_PASSWORD vacías en .env: login manual.');
    return false;
  }

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ timeout: 15_000 });
  await passwordInput.fill(password);

  const form = page
    .locator('form')
    .filter({ has: passwordInput })
    .first();
  const textInput = form.locator('input[type="text"], input:not([type])').first();
  if (await textInput.count()) {
    await textInput.fill(user);
  }

  const submit = page.locator('button[type="submit"], form input[type="submit"]').first();
  const submitable = await submit.count();
  if (submitable) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load', timeout: 45_000 }).catch(() => undefined),
      submit.click().catch(() => undefined),
    ]);
  }
  console.log('Intento de login automático finalizado.');
  return true;
}

async function main(): Promise<void> {
  ensureOutDir();

  console.log(`Abriendo ${process.env.BDV_URL ?? 'https://bdvenlinea.banvenez.com/'} (navegador visible)...`);
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(process.env.BDV_URL ?? 'https://bdvenlinea.banvenez.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });

  await attemptAutoLogin(page);

  await pressEnter('Si apareció captcha o validación, complétala en el navegador. Presiona Enter cuando estés DENTRO del portal (zona de saldo/cuentas).');

  const html = await page.content();
  writeFileSync(join(OUT_DIR, 'bdv-after-login.html'), html);
  await page.screenshot({ path: join(OUT_DIR, 'bdv-after-login.png'), fullPage: true });

  const text = await page.locator('body').innerText();

  console.log('\n=== POSIBLES SALDOS DETECTADOS ===');
  const balances = text.split('\n').filter((line) => /\d+(?:\.\d{3})*,\d{2}|^\d+,\d{2}$/.test(line));
  balances.slice(0, 30).forEach((line) => console.log(`  ${line.trim()}`));

  console.log('\n=== INPUTS DEL LOGIN (candidatos para bdv.selectors.ts) ===');
  const inputs = await page
    .locator('input[name], input[id]')
    .evaluateAll((els) => els.map((el) => ({ name: el.getAttribute('name'), id: el.id, type: el.getAttribute('type') })));
  console.log(JSON.stringify(inputs, null, 2));

  console.log('\n=== CANDIDATOS PARA balanceContainer ===');
  console.log("Puedes inspeccionar el HTML guardado o usar el inspector de Chrome.");
  console.log(`HTML guardado en: ${join(OUT_DIR, 'bdv-after-login.html')}`);

  console.log(`\nSiguiente paso: edita ${BASE_SELECTORS_URL} con los selectores reales.`);
  await pressEnter('Cierra el navegador.');
  await browser.close();
}

main().catch((error) => {
  console.error('Error en el scout:', error);
  process.exitCode = 1;
});