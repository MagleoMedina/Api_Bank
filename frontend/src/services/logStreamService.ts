import { API_BASE_URL } from '../config/api';

export interface LogEntry {
  level: string;
  message: string;
  context?: string;
  timestamp: string;
}

type Listener = (entry: LogEntry) => void;

const listeners = new Set<Listener>();
let polling = false;
let lastCount = 0;

async function poll(): Promise<void> {
  if (!polling) return;

  try {
    const response = await fetch(`${API_BASE_URL}/logs/buffer`);
    if (response.ok) {
      const entries: LogEntry[] = await response.json();
      if (entries.length > lastCount) {
        const newEntries = entries.slice(lastCount);
        lastCount = entries.length;
        for (const entry of newEntries) {
          for (const listener of listeners) {
            listener(entry);
          }
        }
      } else if (entries.length < lastCount) {
        lastCount = 0;
      }
    }
  } catch {
    // server unreachable
  }

  if (polling) {
    setTimeout(poll, 1500);
  }
}

export function connectLogs(): void {
  if (polling) return;
  polling = true;
  lastCount = 0;
  poll();
}

export function disconnectLogs(): void {
  polling = false;
}

export function onLog(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isConnected(): boolean {
  return polling;
}
