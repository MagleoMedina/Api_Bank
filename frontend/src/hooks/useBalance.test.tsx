import React from 'react';
import { act } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { AccountBalance } from '../api/api';
import { useBalance, type UseBalanceResult } from './useBalance';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
    true;
});

const BALANCE: AccountBalance = {
  bankId: 'mock',
  account: '01020530750000123456',
  accountType: 'corriente',
  balance: 100,
  currency: 'VES',
  fetchedAt: '2026-09-05T15:00:00.000Z',
  source: 'cache',
};

const originalFetch = globalThis.fetch;

function jsonResponse(data: unknown): Response {
  return { ok: true, status: 200, json: async () => data } as unknown as Response;
}

function errorResponse(message: string): Response {
  return {
    ok: false,
    status: 500,
    json: async () => ({ message }),
  } as unknown as Response;
}

interface Harness {
  result: UseBalanceResult;
  unmount: () => Promise<void>;
}

async function createHarness(): Promise<Harness> {
  let latest!: UseBalanceResult;
  function Harness() {
    latest = useBalance();
    return null;
  }

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Harness />);
  });

  return {
    get result() {
      return latest;
    },
    async unmount() {
      await act(async () => {
        renderer.unmount();
      });
    },
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('loadBank obtiene el saldo y lo guarda', async () => {
  const fetchMock = jest.fn().mockResolvedValue(jsonResponse(BALANCE));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  const harness = await createHarness();

  await act(async () => {
    await harness.result.loadBank('mock');
  });

  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/balance?bank=mock'),
    expect.objectContaining({ signal: expect.anything() }),
  );
  expect(harness.result.balance).toEqual(BALANCE);
  expect(harness.result.activeBank).toBe('mock');
  expect(harness.result.isLoading).toBe(false);
  expect(harness.result.error).toBeNull();

  await harness.unmount();
});

test('loadBank propaga el mensaje del backend cuando falla', async () => {
  globalThis.fetch = jest.fn().mockResolvedValue(
    errorResponse('El portal rechazó las credenciales'),
  ) as unknown as typeof fetch;
  const harness = await createHarness();

  await act(async () => {
    await harness.result.loadBank('bdv');
  });

  expect(harness.result.error).toBe('El portal rechazó las credenciales');
  expect(harness.result.balance).toBeNull();
  expect(harness.result.isLoading).toBe(false);

  await harness.unmount();
});

test('loadBank traduce un fallo de red', async () => {
  globalThis.fetch = jest
    .fn()
    .mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;
  const harness = await createHarness();

  await act(async () => {
    await harness.result.loadBank('bdv');
  });

  expect(harness.result.error).toBe('No se pudo conectar con el servidor.');

  await harness.unmount();
});

test('refresh pide el endpoint /refresh y mantiene el dato visible', async () => {
  const updated = { ...BALANCE, balance: 250, source: 'live' };
  const fetchMock = jest.fn().mockResolvedValue(jsonResponse(BALANCE));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  const harness = await createHarness();

  await act(async () => {
    await harness.result.loadBank('mock');
  });

  fetchMock.mockResolvedValue(jsonResponse(updated));
  let resolveFetch!: (value: Response) => void;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
  );

  let refreshPromise!: Promise<void>;
  await act(async () => {
    refreshPromise = harness.result.refresh();
  });
  expect(harness.result.isRefreshing).toBe(true);
  expect(harness.result.balance).toEqual(BALANCE);

  await act(async () => {
    resolveFetch(jsonResponse(updated));
    await refreshPromise;
  });

  expect(fetchMock).toHaveBeenLastCalledWith(
    expect.stringContaining('/balance/refresh?bank=mock'),
    expect.anything(),
  );
  expect(harness.result.balance).toEqual(updated);
  expect(harness.result.isRefreshing).toBe(false);

  await harness.unmount();
});

test('refresh sin banco seleccionado no hace nada', async () => {
  const fetchMock = jest.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  const harness = await createHarness();

  await act(async () => {
    await harness.result.refresh();
  });

  expect(fetchMock).not.toHaveBeenCalled();

  await harness.unmount();
});