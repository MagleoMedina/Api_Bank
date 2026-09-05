# multi_bank

Backend **NestJS** con arquitectura por capas que consulta el saldo de cuentas bancarias
y lo expone por HTTP. Multi-banco desde el inicio: actualmente soporta:

- **`mock`** — banco simulado (desarrollo, tests, CI). **Banco por defecto.**
- **`bdv`** — Banco de Venezuela (**BDVenlínea**), vía scraping con Playwright.

## Endpoints

| Endpoint | Descripción |
| --- | --- |
| `GET /balance?bank=bdv&account=N` | Saldo. Usa caché si está fresco (TTL), si no hace scraping en vivo. `bank` default: `mock`. |
| `GET /balance/refresh?bank=bdv` | Fuerza el scraping al banco y actualiza caché. |

Ejemplo de respuesta:

```json
{
  "bankId": "bdv",
  "account": "01020530750000123456",
  "accountType": "corriente",
  "balance": 5234.56,
  "currency": "VES",
  "fetchedAt": "2026-09-04T22:00:00.000Z",
  "source": "cache"
}
```

`source` indica si la respuesta vino del caché (`cache`) o del banco (`live`).

## Arquitectura por capas

```
src/modules/balance/
├── presentation/   HTTP: controller + DTOs + filters (errores → HTTP)
├── application/    Casos de uso: GetBalanceUseCase, registro de bancos (registry)
├── domain/         Entidad AccountBalance, puertos (contratos), excepciones
└── infrastructure/ Adaptadores concretos (bdv con Playwright, mock) + caché in-memory
```

Separación:
- **Dominio** no depende de Nest ni de Playwright: define `BankGatewayPort` y `BalanceCachePort`.
- **Aplicación** orquesta: resuelve el banco, decide caché vs. scraping.
- **Infraestructura** implementa los puertos. Añadir un banco = implementar `BankGatewayPort` y registrarlo.

## Configuración

Copia `.env.example` a `.env`:

```bash
cp .env.example .env
```

Variables:

| Variable | Default | Descripción |
| --- | --- | --- |
| `PORT` | `3000` | Puerto HTTP |
| `BIND_HOST` | `127.0.0.1` | Solo localhost. Para exponer en red, cambiarlo. |
| `DEFAULT_BANK` | `mock` | Banco usado si no se pasa `?bank=` |
| `BALANCE_CACHE_TTL_MS` | `300000` | Vigencia del caché (5 min) |
| `HEADLESS` | `true` | Playwright headless |
| `BDV_USER` | — | Usuario (cédula) de BDVenlínea |
| `BDV_PASSWORD` | — | Contraseña de BDVenlínea |
| `BDV_URL` | `https://bdvenlinea.banvenez.com/` | URL del portal |

Instalar el navegador de Playwright (una vez):

```bash
npx playwright install chromium
```

## Ejecución

```bash
npm install
npm run start:dev        # desarrollo (watch)
npm run start:prod       # producción (dist/main)
```

Probar:

```bash
curl http://127.0.0.1:3000/balance                    # mock (default)
curl "http://127.0.0.1:3000/balance?bank=bdv"         # BDV en vivo si no hay caché
curl -X GET "http://127.0.0.1:3000/balance/refresh?bank=bdv"  # fuerza scraping
```

## Calibrar selectores de BDV (scout)

Los selectores del portal (`bdv.selectors.ts`) son placeholder: **BDVenlínea cambia su HTML
continuamente** y puede mostrar captcha/validaciones en el login. Para fijarlos:

```bash
npm run scout:bdv
```

El scout abre BDV en navegador visible, intenta login automático si hay credenciales en `.env`
(o deja que las ingreses a mano), espera a que completes captcha si aparece, y guarda el HTML
post-login en `scripts/out/` + detecta los inputs del login y posibles saldos. Con esa
información actualiza `src/modules/balance/infrastructure/adapters/bdv/bdv.selectors.ts`.

Si el portal muestra captcha, el adapter BDV responderá `502` con mensaje explícito en lugar de
fallar silenciosamente.

## Añadir un banco nuevo

1. Implementa `BankGatewayPort` (interfaz `getBalance(account?)`) en `infrastructure/adapters/<nuevo>/`.
2. Registra la credencial en `src/config/configuration.ts` (`bankCredentials.<id>`).
3. Lo agregas en el `BANK_GATEWAY_TOKEN` de `balance.module.ts`.

## Seguridad

- El servidor escucha solo en `127.0.0.1` por defecto (`BIND_HOST`): **no expongas tus finanzas
  en la red**. Para servir en otro host cambia el `.env`.
- Las credenciales del banco viven **en `.env`** (excluido de git) — planas en el servidor. Para
  producción se recomienda un gestor de secretos.
- No se loguean credenciales; la contraseña de BDV entra directo al formulario del banco.

## Comandos

```bash
npm run test       # unit (vitest)
npm run test:e2e   # e2e (levanta la app)
npm run lint       # oxlint
npm run build      # nest build
```