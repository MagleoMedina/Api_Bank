/**
 * Observador de BDT Online (Banco del Tesoro).
 *
 * Abre el portal en un navegador visible y REGISTRA todo lo que hagas:
 * va guardando snapshots del DOM cada vez que cambia (login de
 * cédula → paso de contraseña, OTP/captcha si aparece, navegación
 * hasta el dashboard y su saldo) en scripts/out/manual-bdt/.
 *
 * Al final, analiza lo grabado y sugiere selectores reales para
 * bdt.selectors.ts.
 *
 * Uso:
 *   npm run observe:bdt
 *
 * 1. Se abre el navegador (usuario y clave autocompletados si están
 *    en .env como BDT_CEDULA/BDT_PASSWORD).
 * 2. Se envía el login automáticamente: selecciona tipodocben=01,
 *    rellena la cédula (#documento) y pulsa Ingresar. Si aparece el
 *    paso de contraseña, complétalo tú mismo.
 * 3. Navega hasta el dashboard y QUÉDATE en la pantalla del saldo
 *    unos segundos; la grabación se detiene sola.
 */
import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright';

const OUT_DIR = fileURLToPath(new URL('./out/manual-bdt/', import.meta.url));
const START_URL = process.env.BDT_URL ?? 'https://bdtenlinea.bdt.com.ve/?p=1';

const POLL_MS = 1500;
const STABLE_STOP_ROUNDS = Number(process.env.OBSERVE_STABLE_ROUNDS ?? 4);
const MAX_SNAPSHOTS = 120;
const STOP_AFTER_MS = 8 * 60_000;

// Cantidad estilo es-VE: 1.234,56 (Bs 1.234,56).
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
  const cedula = process.env.BDT_CEDULA ?? '';
  const password = process.env.BDT_PASSWORD ?? '';
  if (!cedula) {
    console.log('BDT_CEDULA vacía en .env -> login 100% manual.');
    return;
  }

  // El formulario (#login-form) llega por AJAX (postURL a /lg) dentro de
  // #content. Esperamos a que #documento esté visible.
  const docInput = page.locator('#documento').first();
  await docInput.waitFor({ state: 'visible', timeout: 60_000 });

  // Tipo de documento: 01 = Venezolano.
  const tipodoc = page.locator('#tipodocben').first();
  await tipodoc.selectOption('01');

  await docInput.fill(cedula);

  const cmdLogin = page.locator('#cmdLogin').first();
  await cmdLogin.click().catch(async () => cmdLogin.evaluate((el: HTMLElement) => el.click()));
  console.log('Cédula enviada. Si aparece paso de contraseña, complétalo tú mismo.');

  // Si el paso de contraseña aparece automáticamente (container.html(data))
  // y tenemos clave, la enviamos también.
  if (password) {
    await page.waitForTimeout(2_500);
    const docStill = await page.locator('#documento').count();
    if (docStill > 0) {
      const cmdStill = await cmdLogin.count();
      if (cmdStill > 0) {
        await docInput.fill(password);
        await cmdLogin.click().catch(async () => cmdLogin.evaluate((el: HTMLElement) => el.click()));
        console.log('Contraseña enviada.');
      }
    }
  }
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
    const matches = [...html.matchAll(/<(input|button|form|select)\b[^>]*>/gi)]
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
      if (t && (SALDO_NUMBER.test(t) || /saldo|cuenta|disponible|consolidada/i.test(t))) {
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
  console.log('Portal abierto. Si aparece OTP/captcha o un paso de contraseña,');
  console.log('complétalo manualmente y navega hasta el DASHBOARD con el saldo visible;');
  console.log('quédate en esa pantalla unos segundos.\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
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
      const hasPanel = /Saldo|Disponible|Cuentas|Consolidada|Posición/i.test(text);
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