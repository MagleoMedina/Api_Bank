/**
 * Selectores del portal Venezolano Online (Banco Venezolano de Crédito).
 *
 * Calibrados con la captura real del observador scripts/out/manual-vol/
 * (flujo del 2026-09-05): login usuario+clave → redirección automática a
 * "Consulta Consolidada" (consultaConsolidada.action) donde está el saldo.
 *
 * FLUJO REAL DE LOGIN (Struts/action + jQuery/BlockUI, no SPA):
 *   1) GET de la raíz responde el form #frmlogin (en /VOL-Web/vc510.action).
 *      Se rellena usuario (#datoLogin) y clave (#clave, con foco se muestra
 *      un teclado virtual que el relleno programático evita).
 *   2) Al enviar (#aceptar) hace un POST completo a vc510.action con
 *      transactionRequest=510. Si las credenciales son válidas, el portal
 *      cae de inmediato en el shell autenticado y navega solo a
 *      consultaConsolidada.action ("Consulta Consolidada").
 *
 * SALDO EN LA CONSOLIDA (consultaConsolidada.action):
 *   El bloque de cuentas en Bs está en #RowCuentas. La cabecera
 *   #datos_generales contiene la etiqueta ("Cuentas en Bolívares") y el
 *   total en el enlace .credito con formato "Total: Bs 904,79". Cada cuenta
 *   vive en el collapse #cardinteriorCtaBs (producto en .infocardtitulo).
 *   Como la app muestra un saldo por banco, se usa el total de cuentas Bs
 *   (decisión del usuario el 2026-09-05; el fideicomiso se queda fuera).
 *
 * FLUJO REAL DE LOGOUT (extraído del HTML capturado):
 *   El enlace "Salir" (onclick="salir()") abre un confirm() nativo y luego
 *   POSTea el form oculto #formMenu a /VOL-Web/vol/vc540.do (o vc540Movil.do
 *   si la cabecera es angosta < 1200px) con event=logOff y
 *   transactionRequest=540. La sesión termina al navegar a esa URL.
 */
export const VOL_SELECTORS = {
  // Login
  loginUrl: '/VOL-Web/vc510.action',
  loginForm: '#frmlogin',
  userInput: '#frmlogin #datoLogin',
  passwordInput: '#frmlogin #clave',
  loginSubmit: '#frmlogin #aceptar',
  loginError: '#errorAction',

  // Dashboard (Consulta Consolidada)
  dashboardUrl: '/VOL-Web/consultaConsolidada.action',
  cuentaBsSection: '#RowCuentas',
  cuentaBsHeader: '#datos_generales',
  cuentaBsLabel: '#datos_generales strong',
  cuentaBsTotal: '#datos_generales .credito',
  cuentaBsProductType: '#cardinteriorCtaBs .infocardtitulo',

  // Logout
  logoutLink: 'a[onclick*="salir()"]',
  logoutWebUrl: '/VOL-Web/vol/vc540.do',
  logoutMovilUrl: '/VOL-Web/vol/vc540Movil.do',
}