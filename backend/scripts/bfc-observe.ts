/**
 * Observador de BFC (Fondo Comunal).
 *
 * Abre el portal en un navegador visible y REGISTRA todo lo que hagas:
 * va guardando snapshots del DOM cada vez que cambia (login usuario/clave,
 * navegación hasta el dashboard y su saldo) en scripts/out/manual-bfc/.
 *
 * Al final, analiza lo grabado y sugiere selectores reales para
 * bfc.selectors.ts.
 *
 * Uso:
 *   npm run observe:bfc
 *
 * 1. Se abre el navegador (usuario y clave autocompletados si están
 *    en .env como BFC_USER/BFC_PASSWORD).
 * 2. Se envía el login automáticamente: rellena los campos y pulsa
 *    Ingresar.
 * 3. Navega hasta el dashboard y QUÉDATE en la pantalla del saldo
 *    unos segundos; la grabación se detiene sola.
 */
import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright';

const OUT_DIR = fileURLToPath(new URL('./out/manual-bfc/', import.meta.url));
const START_URL = process.env.BFC_URL ?? 'https://www20.bfc.com.ve/';

const POLL_MS = 1500;
const STABLE_STOP_ROUNDS = Number(process.env.OBSERVE_STABLE_ROUNDS ?? 15);
const MAX_SNAPSHOTS = 120;
const STOP_AFTER_MS = 30 * 60_000;

// Patrón de saldo VES: 123.456,78 o 1234,56
const VES_PATTERN = /\b\d{1,3}(?:\.\d{3})+(?:,\d{2})?\b|\b\d+,\d{2}\b/g;

let lastHash = '';
let snapshotCount = 0;
const flowLog: string[] = [];
let currentBody = '';

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

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 8);
}

function isStale(current: string, last: string): boolean {
  return current === last || current.length < 20 || last.length < 20;
}

async function main() {
  console.log(`Iniciando observador BFC en ${START_URL}`);
  console.log(`Out dir: ${OUT_DIR}`);

  ensureOutDir();

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(START_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  console.log('Página cargada, esperando interacciones...');

  // Bloquear scripts anti-devtools
  await page.route('**/*disabled-devtool*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: '// blocked',
    });
  });

  // Función para capturar el body y hacer hash
  async function capture(): Promise<string> {
    currentBody = await page.locator('body').innerText().catch(() => '');
    return hashText(currentBody);
  }

  // Grabar snapshot inicial
  const initialHash = await capture();
  const initialHtml = currentBody ? currentBody.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>') : '';
  flowLog.push(`00-root.html | ${page.url()} | bytes-estimado`);
  writeFileSync(join(OUT_DIR, `${snapshotBaseName()}-root.html`), initialHtml);
  snapshotCount = 1;
  lastHash = initialHash;

  // Bucle de observación
  let stableRounds = 0;
  while (snapshotCount < MAX_SNAPSHOTS) {
    await page.waitForTimeout(POLL_MS);

    const currentHash = await capture();

    // Verificar si cambió el texto
    if (!isStale(currentHash, lastHash)) {
      // Guardar snapshot
      const fname = `${snapshotBaseName()}-${slugOf(page.url())}.html`;
      const htmlContent = currentBody ? currentBody.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>') : '';
      writeFileSync(join(OUT_DIR, fname), htmlContent);
      flowLog.push(`${snapshotBaseName()}-${slugOf(page.url())} | ${page.url()} | ${new Date().toLocaleTimeString()}`);
      snapshotCount++;
      lastHash = currentHash;
      stableRounds = 0; // reset stable counter
      console.log(`Snapshot ${snapshotCount}: ${fname}`);
    } else {
      stableRounds++;
    }

    // Detener si lleva tiempo sin cambios
    if (stableRounds >= STABLE_STOP_ROUNDS) {
      console.log(`Sin cambios detectados durante ${STABLE_STOP_ROUNDS} rondas. Deteniendo...`);
      break;
    }

    // Detener si pasó el tiempo máximo
    if (Date.now() - new Date().setHours(0, 0, 0) > STOP_AFTER_MS) {
      console.log('Llegó al límite de tiempo maximo. Deteniendo...');
      break;
    }
  }

  console.log(`Observación finalizada. Total snapshots: ${snapshotCount}`);
  console.log(`Ver los resultados en: ${OUT_DIR}`);

  // Mantener el navegador abierto unos segundos más para inspección manual
  await page.waitForTimeout(10_000);
  await browser.close();
}

main().catch(err => {
  console.error('Error en el observador:', err);
  process.exit(1);
});