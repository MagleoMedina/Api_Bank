/**
 * Smoke test: la app arranca sin errores y muestra el contenido principal.
 *
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

function renderTreeText(node: unknown): string {
  if (node === null || node === undefined) {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return typeof node === 'string' ? node : '';
  }
  if (Array.isArray(node)) {
    return node.map(renderTreeText).join('');
  }
  return renderTreeText((node as { children?: unknown }).children);
}

test('renderiza la app y muestra la pantalla principal', async () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App />);
  });
  const json = tree.toJSON();
  const text = renderTreeText(json);

  expect(text).toContain('Multibank');
  expect(text).toContain('Selecciona un banco para consultar tu saldo');
  expect(text).toContain('Saldo BDV');
  expect(text).toContain('Saldo BNC');
  expect(text).toContain('Saldo de prueba');
});