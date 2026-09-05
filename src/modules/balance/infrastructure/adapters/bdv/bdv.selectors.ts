/**
 * Selectores del portal BDVenlínea personas.
 *
 * Estos selectores fueron calibrados con reproducciones headless del flujo real
 * (login de dos pasos → Posición Consolidada → saldo) y snapshots del observador
 * en scripts/out/manual/.
 *
 * FLUJO REAL DE LOGIN (dos pasos, Angular Material):
 *   1) Input de usuario (mat-input-0) + botón "Entrar"
 *   2) Input de contraseña (input[name="password"]) + botón "Continuar"
 * Tras el login el portal cae directamente en .../main/posicionconsolidada con
 * la tabla de saldos visible.
 *
 * NOTA: el portal usa Angular Material; si el banco cambia el HTML, revisa los
 * snapshots en scripts/out/manual/ para reparar rápido.
 */
export const BDV_SELECTORS = {
  usernameInput: 'input[type="text"], input:not([type])',
  passwordInput: 'input[name="password"]',
  step1Submit: 'button[type="submit"]',
  step2Submit: "button[type='submit']",
  loginError: '.error-message',
  balanceTable: 'table.table-saldo-cuenta',
  balanceRow: 'tbody tr[role="row"]',
  accountCell: 'td[headers="numero"] span.links',
  eyeIcon: 'mat-icon',
  balanceModal: 'app-modal-saldo-cuenta table',
  modalSaldoCells: 'tbody tr td.saldo',
};