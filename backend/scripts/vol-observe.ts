/**
 * Observador de Venezolano Online (Banco Venezolano de Crédito).
 *
 * Abre el portal en un navegador visible y REGISTRA todo lo que hagas:
 * va guardando snapshots del DOM cada vez que cambia (login de usuario+clave,
 * OTP/captcha, navegación hasta el dashboard y su saldo) en
 * scripts/out/manual-vol/.
 *
 * Al final, analiza lo grabado y sugiere selectores reales para
 * vol.selectors.ts.
 *
 * Uso:
 *   npm run observe:vol
 *
 * 1. Se abre el navegador (usuario y clave autocompletados si están en .env
 *    como VOL_USER/VOL_PASSWORD).
 * 2. Se envía el login automáticamente. Si aparece OTP/captcha, complétalo tú
 *    mismo; en el login también puede salir un modal de imagen de seguridad.
 * 3. Navega hasta el dashboard y QUÉDATE en la pantalla del saldo unos
 *    segundos; la grabación se detiene sola.
 */
import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright';

const OUT_DIR = fileURLToPath(new URL('./out/manual-vol/', import.meta.url));
const START_URL = process.env.VOL_URL ?? 'https://vol.venezolano.com/';

const POLL_MS = 1500;
// Rondas de DOM estable para auto-detener tras ver el saldo. Se puede subir
// (OBSERVE_STABLE_ROUNDS) para capturar flujos posteriores (p. ej. logout).
const STABLE_STOP_ROUNDS = Number(process.env.OBSERVE_STABLE_ROUNDS ?? 4);
const MAX_SNAPSHOTS = 120;
const STOP_AFTER_MS = 8 * 60_000;

// Cantidad estilo es-VE: 1.234,56 (Bs 1.234,56 | USD 12,34).
const SALDO_NUMBER = /\b\d{1,3}(?:\.\d{3})+(?:,\d{2})?\b|\b\d+,\d{2}\b/g;

let lastHash = '';
let snapshotCount = 0;
const flowLog: string[] = [];

function ensureOutDir(): void {
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }
}

function slugOf(url: string): string {
  const clean = url
    .replace(START_URL, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .slice(0, 60);
  return clean || 'root';
}

function snapshotBaseName(): string {
  return String(snapshotCount).padStart(2, '0');
}

async function autofill(page: Page): Promise<void> {
  const user = process.env.VOL_USER ?? '';
  const password = process.env.VOL_PASSWORD ?? '';
  if (!user || !password) {
    console.log('VOL_USER/VOL_PASSWORD vacías en .env -> login 100% manual.');
    return;
  }

  const userInput = page.locator('#datoLogin').first();
  await userInput.waitFor({ state: 'visible', timeout: 60_000 });
  await userInput.fill(user);

  const passwordInput = page.locator('#clave').first();
  await passwordInput.fill(password);

  const aceptar = page.locator('#aceptar').first();
  await Promise.all([
    page
      .waitForNavigation({ waitUntil: 'load', timeout: 120_000 })
      .catch(() => undefined),
    aceptar.click().catch(async () => aceptar.evaluate((el: HTMLElement) => el.click())),
  ]);
  console.log('Login enviado (usuario + clave). Si aparece OTP/captcha, complétalo tú mismo.');
}

async function record(page: Page): Promise<boolean> {
  const html = await page.content().catch(() => '');
  if (!html) {
    return false;
  }
  const hash = createHash('sha1').update(html).digest('hex');
  if (hash === lastHash) {
    return false;
  }
  lastHash = hash;

  snapshotCount += 1;
  const base = `${snapshotBaseName()}-${slugOf(page.url())}`;
  const htmlFile = `${base}.html`;
  writeFileSync(join(OUT_DIR, htmlFile), html);
  const text = await page.locator('body').innerText().catch(() => '');
  writeFileSync(join(OUT_DIR, `${base}.txt`), text);
  await page
    .screenshot({ path: join(OUT_DIR, `${base}.png`), fullPage: false })
    .catch(() => undefined);

  const line = `${new Date().toLocaleTimeString()} | ${htmlFile} | ${page.url()} | bytes=${html.length}`;
  flowLog.push(line);
  console.log(' * ' + line);
  return true;
}

function analyze(): void {
  console.log('\n=========== REPORTE ===========');
  const files = readdirSync(OUT_DIR);

  const first = files
    .filter((f) => f.endsWith('.html'))
    .sort()[0];
  if (first) {
    console.log(`\n[1] Login (primer snapshot: ${first}) - inputs y botones:`);
    const html = readFileSync(join(OUT_DIR, first), 'utf8');
    const matches = [...html.matchAll(/<(input|button|form)\b[^>]*>/gi)]
      .map((m) =>
        m[0]
          .replace(/class="[^"]*"/g, '')
          .trim(),
      )
      .filter((s) => !s.includes('<style'));
    for (const m of matches.slice(0, 25)) {
      console.log('   ' + m);
    }
  }

  const txts = files
    .filter((f) => f.endsWith('.txt'))
    .sort();
  console.log(`\n[2] Saldo en las últimas pantallas (${txts.length} txt capturados):`);
  for (const f of txts.slice(-8)) {
    const text = readFileSync(join(OUT_DIR, f), 'utf8');
    const lines = text.split('\n');
    const hits: Array<[number, string]> = [];
    lines.forEach((line, i) => {
      const t = line.trim();
      if (t && (SALDO_NUMBER.test(t) || /saldo|cuenta|disponible|posición/i.test(t))) {
        hits.push([i, t.slice(0, 90)]);
      }
    });
    if (hits.length) {
      console.log(`\n  --- ${f} ---`);
      for (const [, t] of hits.slice(0, 12)) {
        console.log('     ' + t);
      }
    }
  }
  console.log('\n======== FIN REPORTE =========');
}

async function main(): Promise<void> {
  ensureOutDir();
  console.log(`Grabando tu flujo en: ${OUT_DIR}`);
  console.log('Portal abierto. Si aparece OTP/captcha o un modal de imagen de seguridad,');
  console.log('complétalo manualmente y navega hasta el DASHBOARD con el saldo visible;');
  console.log('quédate en esa pantalla unos segundos.\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  // Acepta confirmaciones nativas (window.confirm) para que el logout no se quede bloqueado.
  page.on('dialog', (dialog) => dialog.accept().catch(() => undefined));
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(START_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      break;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }
      console.log(`Intento ${attempt} fallido (${
        error instanceof Error ? error.message : String(error)
      }), reintentando...`);
      await page.waitForTimeout(2000);
    }
  }
  await autofill(page);

  const started = Date.now();
  let stableRounds = 0;
  let sawBalance = false;

  while (Date.now() - started < STOP_AFTER_MS && snapshotCount < MAX_SNAPSHOTS) {
    if (!browser.isConnected()) {
      console.log('Navegador cerrado por el usuario. Deteniendo grabación.');
      break;
    }
    await page.waitForTimeout(POLL_MS);
    let changed = false;
    try {
      changed = await record(page);
    } catch {
      changed = false;
    }

    if (changed) {
      stableRounds = 0;
      const text = await page.locator('body').innerText().catch(() => '');
      const hasPanel = /Saldo|Disponible|Cuentas|Posición|Bienvenido/i.test(text);
      const hasNumber = SALDO_NUMBER.test(text);
      if (hasPanel && hasNumber) {
        sawBalance = true;
        console.log('>> Saldo visible detectado; esperando estabilidad...');
      }
    } else {
      stableRounds += 1;
    }

    if (sawBalance && stableRounds >= STABLE_STOP_ROUNDS) {
      console.log('Flujo estable con saldo visible. Deteniendo grabación.');
      break;
    }
  }

  writeFileSync(join(OUT_DIR, 'flow.log'), flowLog.join('\n') + '\n');
  console.log(`Grabación finalizada (${snapshotCount} snapshots).`);
  await browser.close();
  analyze();
}

main().catch((error) => {
  console.error('Error en el observador:', error);
  process.exitCode = 1;
});