// Stub Trace class for gated live E2E tests.
export class Trace {
  logs: any[] = [];
  add(entry: any) {
    this.logs.push(entry);
  }
}
