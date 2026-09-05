import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { BdvBankAdapter } from './../src/modules/balance/infrastructure/adapters/bdv/bdv-bank.adapter.js';
import { BankGatewayPort } from './../src/modules/balance/domain/ports/bank-gateway.port.js';
import { BankCredentialsMissingException } from './../src/modules/balance/domain/exceptions/bank-credentials-missing.exception.js';

const bdvStub: BankGatewayPort = {
  bankId: 'bdv',
  getBalance: async () => {
    throw new BankCredentialsMissingException('bdv');
  },
};

describe('Balance API (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(BdvBankAdapter)
      .useValue(bdvStub)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/balance (GET) devuelve saldo del banco mock por defecto', async () => {
    const response = await request(app.getHttpServer()).get('/balance').expect(200);

    expect(response.body).toMatchObject({
      bankId: 'mock',
      balance: expect.any(Number),
      currency: 'VES',
      source: 'live',
    });
  });

  it('/balance?bank=bdv responde 401 si no hay credenciales configuradas', async () => {
    const response = await request(app.getHttpServer())
      .get('/balance?bank=bdv')
      .expect(401);

    expect(response.body.message).toContain('Faltan credenciales');
  });

  it('/balance?bank=desconocido responde 400 con banco no soportado', async () => {
    const response = await request(app.getHttpServer())
      .get('/balance?bank=desconocido')
      .expect(400);

    expect(response.body.message).toContain('no está registrado');
  });

  afterEach(async () => {
    await app.close();
  });
});