/**
 * Capturador mínimo de BDT Online (Banco del Tesoro).
 *
 * Abre el portal en un navegador visible y GRABA tu flujo manual:
 * navega tú mismo por el login (cédula, paso de contraseña si lo
 * hay), hasta el dashboard con el saldo visible.
 *
 * Uso:
 *   npm run capture:bdt
 *
 * 1. Se abre el navegador en la página principal del portal.
 * 2. Tú navegas manualmente (login, OTP/captcha, contraseña,
 *    dashboard).
 * 3. Cuando tengas el saldo visible, cierra el navegador o pulsa
 *    Ctrl+C; la grabación se detiene y se genera un análisis con
 *    los selectores candidatos para bdt.selectors.ts.
 */
import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright';

const OUT_DIR = fileURLToPath(new URL('./out/manual-bdt/', import.meta.url));
const START_URL = process.env.BDT_URL ?? 'https://bdtenlinea.bdt.com.ve/?p=1';

const POLL_MS = 1500;
const MAX_SNAPSHOTS = 200;
const STOP_AFTER_MS = 15 * 60_000;
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
  const clean = url.replace(START_URL, '').replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 60);
  return clean || 'root';
}

function snapshotBaseName(): string {
  return String(snapshotCount).padStart(2, '0');
}

async function record(page: Page): Promise<boolean> {
  const html = await page.content().catch(() => '');
  if (!html) return false;
  const hash = createHash('sha1').update(html).digest('hex');
  if (hash === lastHash) return false;
  lastHash = hash;

  snapshotCount += 1;
  const base = `${snapshotBaseName()}-${slugOf(page.url())}`;
  writeFileSync(join(OUT_DIR, `${base}.html`), html);
  const text = await page.locator('body').innerText().catch(() => '');
  writeFileSync(join(OUT_DIR, `${base}.txt`), text);
  await page.screenshot({ path: join(OUT_DIR, `${base}.png`), fullPage: false }).catch(() => undefined);

  const line = `${new Date().toLocaleTimeString()} | ${base}.html | ${page.url()} | bytes=${html.length}`;
  flowLog.push(line);
  console.log(' * ' + line);
  return true;
}

function analyze(): void {
  console.log('\n=========== REPORTE ===========');
  const files = readdirSync(OUT_DIR);
  const txts = files.filter((f) => f.endsWith('.txt')).sort();

  console.log('\n[1] Inputs/buttons con id/name encontrados:');
  const first = files.filter((f) => f.endsWith('.html')).sort()[0];
  if (first) {
    const html = readFileSync(join(OUT_DIR, first), 'utf8');
    const matches = [...html.matchAll(/<(input|button|select|form)\b[^>]*>/gi)]
      .map((m) => m[0].replace(/class="[^"]*"/g, '').trim())
      .filter((s) => !s.includes('<style'));
    for (const m of matches.slice(0, 25)) console.log('   ' + m);
  }

  console.log(`\n[2] Saldo en las capturas (${txts.length} txt):`);
  for (const f of txts.slice(-8)) {
    const text = readFileSync(join(OUT_DIR, f), 'utf8');
    const lines = text.split('\n');
    const hits: Array<[number, string]> = [];
    lines.forEach((line, i) => {
      const t = line.trim();
      if (t && (SALDO_NUMBER.test(t) || /saldo|cuenta|consolidada|disponible/i.test(t))) {
        hits.push([i, t.slice(0, 90)]);
      }
    });
    if (hits.length) {
      console.log(`\n  --- ${f} ---`);
      for (const [, t] of hits.slice(0, 12)) console.log('     ' + t);
    }
  }
  console.log('\n======== FIN REPORTE =========');
}

async function main(): Promise<void> {
  ensureOutDir();
  console.log(`Grabando tu flujo BDT en: ${OUT_DIR}`);
  console.log('Bloqueando scripts anti-devtools para evitar recargas automáticas.');
  console.log('Abre el navegador y navega manualmente por el login,');
  console.log('completa cédula/paso de contraseña y quédate en el DASHBOARD con el saldo visible.\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  // Evita que disabled-devtool.js detecte devtools y fuerce recargas.
  await page.route('**/disabled-devtool.js', (route) => route.abort());
  await page.route('**/disabled-devtool*', (route) => route.abort());
  page.on('dialog', (dialog) => dialog.accept().catch(() => undefined));
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(START_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      console.log(`Intento ${attempt} fallido, reintentando...`);
      await page.waitForTimeout(2000);
    }
  }

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
    try { changed = await record(page); } catch { changed = false; }

    if (changed) {
      stableRounds = 0;
      const text = await page.locator('body').innerText().catch(() => '');
      if (SALDO_NUMBER.test(text) || /saldo|cuenta|consolidada/i.test(text)) {
        sawBalance = true;
        console.log('>> Saldo visible detectado; esperando estabilidad...');
      }
    } else {
      stableRounds += 1;
    }

    if (sawBalance && stableRounds >= 4) {
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
  console.error('Error en el capturador:', error);
  process.exitCode = 1;
});