/**
 * Selectores del portal BFC (Fondo Comunal).
 *
 * FLUJO DE LOGIN:
 *   El portal carga un formulario simple con:
 *   - input[name="user"]: campo de usuario
 *   - input[name="password"]: campo de contraseña
 *   - button[type="submit"]: botón de envío
 *
 * DASHBOARD:
 *   El saldo aparece en el body con patrón numérico VES.
 *
 * LOGOUT:
 *   Enlace de logout en la navegación.
 */
export const BFC_SELECTORS = {
  // Login
  userInput: 'input[name="user"]',
  passwordInput: 'input[name="password"]',
  loginSubmit: 'button[type="submit"]',

  // Dashboard
  balanceContainer: 'body',

  // Logout
  logoutLink: 'a[href*="logout"]',
}