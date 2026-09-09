import { Controller, Get, Sse } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { LogService, type LogEntry } from './log.service.js';

@Controller()
export class LogsController {
  constructor(private readonly logService: LogService) {}

  @Get('logs')
  @Sse()
  streamLogs(): Observable<{ data: LogEntry }> {
    return this.logService.logs$.pipe(map((entry) => ({ data: entry })));
  }

  @Get('logs/buffer')
  getBuffer(): LogEntry[] {
    return this.logService.getBuffer();
  }
}
