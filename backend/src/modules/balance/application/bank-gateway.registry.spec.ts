import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { BankGatewayRegistry } from './bank-gateway.registry.js';
import type { BankGatewayPort } from '../domain/ports/bank-gateway.port.js';
import { BankNotSupportedException } from '../domain/exceptions/bank-not-supported.exception.js';

function makeConfig(defaultBank: string): ConfigService {
  return {
    get: (key: string) => (key === 'defaultBank' ? defaultBank : undefined),
  } as unknown as ConfigService;
}

const mockGateway = { bankId: 'mock', getBalance: vi.fn() } as unknown as BankGatewayPort;
const bdvGateway = { bankId: 'bdv', getBalance: vi.fn() } as unknown as BankGatewayPort;
const bncGateway = { bankId: 'bnc', getBalance: vi.fn() } as unknown as BankGatewayPort;
const volGateway = { bankId: 'vol', getBalance: vi.fn() } as unknown as BankGatewayPort;
const bdtGateway = { bankId: 'bdt', getBalance: vi.fn() } as unknown as BankGatewayPort;
const bfcGateway = { bankId: 'bfc', getBalance: vi.fn() } as unknown as BankGatewayPort;

describe('BankGatewayRegistry', () => {
  let registry: BankGatewayRegistry;

  beforeEach(() => {
    registry = new BankGatewayRegistry(
      [mockGateway, bdvGateway, bncGateway, volGateway, bdtGateway, bfcGateway],
      makeConfig('mock'),
    );
  });

  it('resuelve el banco por defecto (mock) sin parámetro', () => {
    expect(registry.resolve().bankId).toBe('mock');
    expect(registry.resolve('bdt').bankId).toBe('bdt');
  });

  it('resuelve un banco por su id', () => {
    expect(registry.resolve('bdv').bankId).toBe('bdv');
    expect(registry.resolve('bnc').bankId).toBe('bnc');
    expect(registry.resolve('vol').bankId).toBe('vol');
    expect(registry.resolve('bdt').bankId).toBe('bdt');
    expect(registry.resolve('bfc').bankId).toBe('bfc');
    expect(registry.resolve('bnc').bankId).toBe('bnc');
    expect(registry.resolve('vol').bankId).toBe('vol');
  });

  it('lanza BankNotSupportedException para un banco desconocido', () => {
    expect(() => registry.resolve('desconocido')).toThrow(BankNotSupportedException);
  });

  it('lista los bancos registrados', () => {
    expect(registry.listBanks()).toEqual(['mock', 'bdv', 'bnc', 'vol', 'bdt', 'bfc']);
  });
});