// agents/core/memory.ts
// Simple in-memory KV + document storage. Ephemeral by design.

export class InMemoryStore {
  private kv: Record<string, unknown> = Object.create(null);
  private docs: Record<string, string> = Object.create(null);

  get<T = unknown>(key: string): T | undefined {
    return this.kv[key] as T | undefined;
  }

  set<T = unknown>(key: string, value: T): void {
    this.kv[key] = value as unknown;
  }

  putDoc(name: string, content: string): void {
    this.docs[name] = content;
  }

  getDoc(name: string): string | undefined {
    return this.docs[name];
  }

  docsSnapshot(): Record<string, string> {
    return { ...this.docs };
  }
}

