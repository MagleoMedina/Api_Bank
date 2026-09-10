import { Injectable } from '@nestjs/common';
import { LogService } from './log.service.js';

const API_URL = 'https://api.gocambio.app/api/v1/prices/USD';
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  price: number;
  fetchedAt: number;
}

@Injectable()
export class ExchangeRateService {
  private cache: CacheEntry | null = null;

  constructor(private readonly logService: LogService) {}

  async getUsdRate(): Promise<number> {
    if (this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache.price;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(API_URL, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json() as {
        data: { price: number };
      };

      const price = json.data.price;
      this.cache = { price, fetchedAt: Date.now() };
      this.logService.log(`USD/VES rate: ${price} (source: BCV)`, 'ExchangeRate');
      return price;
    } catch (error) {
      this.logService.warn(
        `Failed to fetch USD rate: ${error instanceof Error ? error.message : String(error)}`,
        'ExchangeRate',
      );
      if (this.cache) {
        return this.cache.price;
      }
      return 0;
    }
  }

  async vesToUsd(vesAmount: number): Promise<number> {
    const rate = await this.getUsdRate();
    if (rate === 0) return 0;
    return Math.round((vesAmount / rate) * 100) / 100;
  }
}
