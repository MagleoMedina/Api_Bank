import { Global, Injectable, LoggerService } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export interface LogEntry {
  level: string;
  message: string;
  context?: string;
  timestamp: string;
}

@Global()
@Injectable()
export class LogService implements LoggerService {
  private readonly subject = new Subject<LogEntry>();
  private readonly buffer: LogEntry[] = [];
  private readonly MAX_BUFFER = 200;

  get logs$(): Observable<LogEntry> {
    return this.subject.asObservable();
  }

  getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  private emit(level: string, message: string, context?: string) {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
    };
    this.buffer.push(entry);
    if (this.buffer.length > this.MAX_BUFFER) {
      this.buffer.shift();
    }
    this.subject.next(entry);
  }

  log(message: string, context?: string) {
    this.emit('log', message, context);
  }

  error(message: string, trace?: string, context?: string) {
    const full = trace ? `${message} — ${trace}` : message;
    this.emit('error', full, context);
  }

  warn(message: string, context?: string) {
    this.emit('warn', message, context);
  }

  debug(message: string, context?: string) {
    this.emit('debug', message, context);
  }

  verbose(message: string, context?: string) {
    this.emit('verbose', message, context);
  }
}
