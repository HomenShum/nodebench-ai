// agents/core/trace.ts
// Structured JSONL logger with in-memory counter. Writes to stdout.

export type TraceEvent = {
  ts: string; // ISO timestamp
  level: 'info' | 'warn' | 'error';
  event: string;
  data?: any;
};

export class Trace {
  private n = 0;

  private write(level: TraceEvent['level'], event: string, data?: any) {
    const rec: TraceEvent = { ts: new Date().toISOString(), level, event, data };
    this.n++;
    // Write as single-line JSON
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(rec));
  }

  info(event: string, data?: any) { this.write('info', event, data); }
  warn(event: string, data?: any) { this.write('warn', event, data); }
  error(event: string, data?: any) { this.write('error', event, data); }

  count(): number { return this.n; }
}

