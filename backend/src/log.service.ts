import { Global, Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export interface LogEntry {
  level: string;
  message: string;
  context?: string;
  timestamp: string;
}

@Global()
@Injectable()
export class LogService {
  private readonly subject = new Subject<LogEntry>();
  private readonly buffer: LogEntry[] = [];
  private readonly MAX_BUFFER = 200;
  private readonly console = new Logger('Server');

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
    if (context) this.console.log(message, context);
    else this.console.log(message);
    this.emit('log', message, context);
  }

  error(message: string, trace?: string, context?: string) {
    if (context) this.console.error(message, trace, context);
    else this.console.error(message, trace);
    const full = trace ? `${message} — ${trace}` : message;
    this.emit('error', full, context);
  }

  warn(message: string, context?: string) {
    if (context) this.console.warn(message, context);
    else this.console.warn(message);
    this.emit('warn', message, context);
  }

  debug(message: string, context?: string) {
    if (context) this.console.debug(message, context);
    else this.console.debug(message);
    this.emit('debug', message, context);
  }

  verbose(message: string, context?: string) {
    if (context) this.console.verbose(message, context);
    else this.console.verbose(message);
    this.emit('verbose', message, context);
  }
}
