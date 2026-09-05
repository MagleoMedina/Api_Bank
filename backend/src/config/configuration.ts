export interface BankCredentialsConfig {
  user?: string;
  card?: string;
  ci?: string;
  password: string;
  url: string;
}

export interface AppConfig {
  port: number;
  host: string;
  defaultBank: string;
  cacheTtlMs: number;
  headless: boolean;
  bankCredentials: Record<string, BankCredentialsConfig>;
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  host: process.env.BIND_HOST ?? '127.0.0.1',
  defaultBank: process.env.DEFAULT_BANK ?? 'mock',
  cacheTtlMs: parseInt(process.env.BALANCE_CACHE_TTL_MS ?? '300000', 10),
  headless: (process.env.HEADLESS ?? 'true') !== 'false',
  bankCredentials: {
    bdv: {
      user: process.env.BDV_USER ?? '',
      password: process.env.BDV_PASSWORD ?? '',
      url: process.env.BDV_URL ?? 'https://bdvenlinea.banvenez.com/',
    },
    bnc: {
      card: process.env.BNC_CARD ?? '',
      ci: process.env.BNC_CI ?? '',
      password: process.env.BNC_PASSWORD ?? '',
      url: process.env.BNC_URL ?? 'https://personas.bncenlinea.com/',
    },
    mock: {
      user: 'mock-user',
      password: 'mock-password',
      url: 'mock://balance',
    },
  },
});