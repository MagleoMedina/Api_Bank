import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { AccountBalance } from '../../api/api';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { BalanceCard } from './BalanceCard';

const LIVE_BALANCE: AccountBalance = {
  bankId: 'bdv',
  account: '0102***9501',
  accountType: 'corriente',
  balance: 138.55,
  currency: 'VES',
  fetchedAt: '2026-09-05T14:58:03.319Z',
  source: 'live',
};

const CACHE_BALANCE: AccountBalance = {
  ...LIVE_BALANCE,
  bankId: 'mock',
  source: 'cache',
};

function allText(node: unknown, texts: string[] = []): string[] {
  if (node === null || node === undefined) {
    return texts;
  }
  if (typeof node === 'string' || typeof node === 'number') {
    if (typeof node === 'string' && node.trim()) {
      texts.push(node.trim());
    }
    return texts;
  }
  if (Array.isArray(node)) {
    node.forEach((child) => allText(child, texts));
    return texts;
  }
  allText((node as { children?: unknown }).children, texts);
  return texts;
}

async function renderCard(data: AccountBalance) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider>
        <BalanceCard data={data} />
      </ThemeProvider>,
    );
  });
  return renderer;
}

test('muestra banco, cuenta, monto formateado y origen en vivo', async () => {
  const renderer = await renderCard(LIVE_BALANCE);
  const texts = allText(renderer.toJSON());

  expect(texts).toContain('Banco de Venezuela');
  expect(texts).toContain('0102***9501');
  expect(texts).toContain('138,55 VES');
  expect(texts).toContain('corriente');
  expect(texts).toContain('En vivo');
});

test('marca el origen como caché', async () => {
  const renderer = await renderCard(CACHE_BALANCE);
  expect(allText(renderer.toJSON())).toContain('Caché');
});

test('expone el botón de actualizar si recibe onRefresh', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider>
        <BalanceCard data={LIVE_BALANCE} onRefresh={() => undefined} />
      </ThemeProvider>,
    );
  });

  const refreshButton = renderer.root.findAll(
    (node) =>
      typeof node.type === 'string' &&
      node.props.accessibilityRole === 'button' &&
      node.props.accessibilityLabel === 'Actualizar saldo',
  );
  expect(refreshButton).toHaveLength(1);
});