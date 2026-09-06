/**
 * Selectores del portal BDT Online (Banco del Tesoro).
 *
 * Calibrados con la captura real del observador scripts/out/manual-bdt/
 * (snapshot 09+ muestra el dashboard con saldo "130.136,90 BS" en
 * "POSICIÓN GLOBAL").
 *
 * FLUJO REAL DE LOGIN (jQuery + AJAX):
 *   1) El portal principal (`https://bdtenlinea.bdt.com.ve/?p=1`) carga
 *      el formulario de login vía AJAX (`postURL` a `/lg`) en `#content`.
 *   2) El formulario `#login-form` tiene:
 *      - `#tipodocben` <select>: tipo de documento (01=Venezolano).
 *      - `#documento` <input type="password">: cédula/PIN (máx 10 dígitos).
 *   3) Al enviar (`#cmdLogin`), se POSTa a `/lg/chk`. Si `data.ok === true`
 *      → `window.location.reload()` (entra al dashboard).
 *
 * DASHBOARD (POSICIÓN GLOBAL):
 *   El saldo principal aparece en un span con clase `.saldo-global` o
 *   directamente en el body como "130.136,90 BS". Se extrae con regex.
 *
 * LOGOUT:
 *   Enlace "Salir" con `onclick="salir()"` → navega a `/logout`.
 */
export const BDT_SELECTORS = {
  // Login step 1 (cedula)
  loginForm: '#login-form',
  docTypeSelect: '#tipodocben',
  docInput: '#documento',
  loginSubmit: '#cmdLogin',

  // Login step 2 (password)
  passwordInput: '#p',

  // Dashboard (POSICIÓN GLOBAL)
  dashboardSection: 'text=POSICIÓN GLOBAL',
  saldoContainer: '.saldo-global',

  // Logout
  logoutLink: 'a[onclick*="salir()"]',
  logoutUrl: '/logout',
}
