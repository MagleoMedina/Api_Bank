/**
 * Selectores del portal BNCNET Personas (Banco Nacional de Crédito).
 *
 * Estos selectores fueron calibrados con la reproducción headless del flujo
 * real (login de dos pasos → dashboard) y los snapshots del observador en
 * scripts/out/manual-bnc/.
 *
 * FLUJO REAL DE LOGIN (ASP.NET MVC + AJAX, no es un SPA):
 *   1) Form #Frm_PreLogin (Personas / Débito | Crédito). Al enviarse hace
 *      un POST AJAX a /Auth/PreLogin_Try con el form serializado (token
 *      anti-CSRF + CardNumber + UserID + prv_LoginType=NATURAL +
 *      prv_InnerLoginType=1). Respuesta 200 → inyecta el paso 2 en
 *      #FormContainer.
 *   2) Form #Frm_Login (con #UserPassword). Al enviarse hace un POST AJAX a
 *      /Auth/Login_Try. Respuesta 200 → window.location =
 *      /Home/BNCNETHB/Welcome (dashboard) en el caso normal.
 *
 * SALDO EN EL DASHBOARD (/Home/BNCNETHB/Welcome):
 *   "Depósitos a la Vista (Bs.)" con el total en .font-size-money dentro de
 *   div.tbs (VES); el equivalente en USD está en div.tusd. El dashboard no
 *   muestra número de cuenta, solo el producto; por eso `account` se rellena
 *   con la etiqueta del producto.
 *
 * FLUJO REAL DE LOGOUT (calibrado el 2026-09-05 con observe:bnc):
 *   El botón "Salir" (a#btn-logout) del topbar navega a /Auth/LogOut, que
 *   muestra "Sesión Finalizada" y es la señal de que la sesión murió.
 *   Snapshots en scripts/out/manual-bnc/ (23 y 24).
 *
 * NOTA: el portal usa Bootstrap + jQuery. Si el banco cambia el HTML, revisa
 * los snapshots en scripts/out/manual-bnc/ para reparar rápido.
 */
export const BNC_SELECTORS = {
  // Paso 1 del login (tarjeta + cédula)
  loginForm: '#Frm_PreLogin',
  cardInput: '#CardNumber',
  ciInput: '#UserID',
  loginSubmit: '#BtnSend',
  loginError: '#LblMessage',

  // Paso 2 del login (contraseña, llega por AJAX dentro de #FormContainer)
  passwordForm: '#Frm_Login',
  passwordInput: '#Frm_Login input[type="password"]',
  passwordSubmit: '#Frm_Login button[type="submit"], #Frm_Login input[type="submit"]',

  // Dashboard
  dashboardUrl: '/Home/BNCNETHB/Welcome',
  balanceBoxVes: 'div.tbs',
  balanceProductLabel: 'div.font-size-product',
  balanceValue: 'div.font-size-money',

  // Logout
  logoutButton: '#btn-logout',
  logoutUrl: '/Auth/LogOut',
};