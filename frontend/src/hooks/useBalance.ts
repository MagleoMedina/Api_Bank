import { useCallback, useRef, useState } from 'react';
import {
  getBalance,
  refreshBalance,
  type AccountBalance,
  type BankId,
} from '../api/api';

export interface UseBalanceResult {
  balance: AccountBalance | null;
  error: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  activeBank: BankId | null;
  loadBank: (bank: BankId) => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido';
}

export function useBalance(): UseBalanceResult {
  const [balance, setBalance] = useState<AccountBalance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeBank, setActiveBank] = useState<BankId | null>(null);
  const serial = useRef(0);

  const loadBank = useCallback(async (nextBank: BankId) => {
    const requestId = ++serial.current;
    setActiveBank(nextBank);
    setBalance(null);
    setError(null);
    setIsLoading(true);
    setIsRefreshing(false);
    try {
      const result = await getBalance(nextBank);
      if (requestId !== serial.current) {
        return;
      }
      setBalance(result);
    } catch (cause) {
      if (requestId !== serial.current) {
        return;
      }
      setError(toMessage(cause));
    } finally {
      if (requestId === serial.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!activeBank) {
      return;
    }
    const requestId = ++serial.current;
    setError(null);
    setIsRefreshing(true);
    try {
      const result = await refreshBalance(activeBank);
      if (requestId !== serial.current) {
        return;
      }
      setBalance(result);
    } catch (cause) {
      if (requestId !== serial.current) {
        return;
      }
      setError(toMessage(cause));
    } finally {
      if (requestId === serial.current) {
        setIsRefreshing(false);
      }
    }
  }, [activeBank]);

  const clearError = useCallback(() => setError(null), []);

  return {
    balance,
    error,
    isLoading,
    isRefreshing,
    activeBank,
    loadBank,
    refresh,
    clearError,
  };
}