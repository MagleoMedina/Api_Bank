/**
 * Scout de Venezolano Online (Banco Venezolano de Crédito).
 *
 * Abre el portal en un navegador visible, intenta el login automático
 * (usuario + clave) y, cuando estés dentro del portal, captura el HTML
 * posterior al login y sugiere selectores para vol.selectors.ts.
 *
 * Uso:
 *   npm run scout:vol
 *
 * Requiere haber ejecutado: npx playwright install chromium
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright';

const BASE_SELECTORS_URL = '../src/modules/balance/infrastructure/adapters/vol/vol.selectors.ts';
const OUT_DIR = fileURLToPath(new URL('./out/', import.meta.url));
const START_URL = process.env.VOL_URL ?? 'https://vol.venezolano.com/';

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
  const user = process.env.VOL_USER ?? '';
  const password = process.env.VOL_PASSWORD ?? '';
  if (!user || !password) {
    console.log('VOL_USER/VOL_PASSWORD vacías en .env: login manual.');
    return;
  }

  const userInput = page.locator('#datoLogin').first();
  await userInput.waitFor({ timeout: 30_000 });
  await userInput.fill(user);

  const passwordInput = page.locator('#clave').first();
  await passwordInput.fill(password);

  const aceptar = page.locator('#aceptar').first();
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load', timeout: 120_000 }).catch(() => undefined),
    aceptar.click().catch(async () => aceptar.evaluate((el: HTMLElement) => el.click())),
  ]);
  console.log('Login enviado (usuario + clave). Si hay OTP/captcha, complétalo manualmente.');
}

async function main(): Promise<void> {
  ensureOutDir();

  console.log(`Abriendo ${START_URL} (navegador visible)...`);
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(START_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  await attemptAutoLogin(page);

  await pressEnter('Si apareció OTP/captcha o modal de imagen de seguridad, complétala en el navegador. Presiona Enter cuando estés DENTRO del portal (dashboard con el saldo visible).');

  const html = await page.content();
  writeFileSync(join(OUT_DIR, 'vol-after-login.html'), html);
  await page.screenshot({ path: join(OUT_DIR, 'vol-after-login.png'), fullPage: true });

  const text = await page.locator('body').innerText();
  writeFileSync(join(OUT_DIR, 'vol-after-login.txt'), text);

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
  console.log('Inspecciona el HTML guardado (vol-after-login.html) para elegir el selector del saldo.');
  console.log(`HTML guardado en: ${join(OUT_DIR, 'vol-after-login.html')}`);

  console.log(`\nSiguiente paso: edita ${BASE_SELECTORS_URL} con los selectores reales.`);
  await pressEnter('Cierra el navegador.');
  await browser.close();
}

main().catch((error) => {
  console.error('Error en el scout:', error);
  process.exitCode = 1;
});