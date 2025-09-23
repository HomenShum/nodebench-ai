// agents/data/contextStore.ts
// Data provider interface with a Convex-backed implementation (optional) and an in-memory fallback.

import { ConvexHttpClient } from "convex/browser";

export type DocPreview = { _id: string; title: string; contentPreview?: string | null };

export interface ContextStore {
  // Documents
  searchDocuments(query: string): Promise<Array<any>>;
  getDocumentById(id: string): Promise<any | null>;
  getSidebarWithPreviews(): Promise<Array<DocPreview>>;
  updateDocument(id: string, patch: { title?: string; content?: string }): Promise<void>;
  createDocument(title: string, content?: string): Promise<string>;

  // Agenda
  listAgendaInRange(input: { start: number; end: number; country?: string; holidaysStartUtc?: number; holidaysEndUtc?: number }): Promise<{ events: any[]; tasks: any[]; holidays: any[]; notes: any[] }>;

  // Agent timeline
  getTimelineByDocumentId(documentId: string): Promise<any | null>;
}

export class InMemoryContextStore implements ContextStore {
  private docs: Record<string, { title: string; content?: string }> = Object.create(null);

  async searchDocuments(query: string) {
    const q = query.toLowerCase();
    return Object.entries(this.docs)
      .filter(([_, v]) => v.title.toLowerCase().includes(q) || (v.content || '').toLowerCase().includes(q))
      .map(([id, v]) => ({ _id: id, title: v.title }));
  }
  async getDocumentById(id: string) { return this.docs[id] ? { _id: id, ...this.docs[id] } : null; }
  async getSidebarWithPreviews() {
    return Object.entries(this.docs).map(([id, v]) => ({ _id: id, title: v.title, contentPreview: (v.content || '').slice(0, 150) }));
  }
  async updateDocument(id: string, patch: { title?: string; content?: string }) { if (!this.docs[id]) this.docs[id] = { title: patch.title || id }; this.docs[id] = { ...this.docs[id], ...patch };
  }
  async createDocument(title: string, content?: string) { const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2)}`; this.docs[id] = { title, content }; return id; }
  async listAgendaInRange() { return { events: [], tasks: [], holidays: [], notes: [] }; }
  async getTimelineByDocumentId() { return null; }
}

export class ConvexContextStore implements ContextStore {
  private client: ConvexHttpClient;
  constructor(url: string, token?: string | null) {
    this.client = new ConvexHttpClient(url);
    if (token) this.client.setAuth(token);
  }
  // Helper to call Convex safely
  private async q<T = any>(fn: string, args?: any): Promise<T> { return await this.client.query(fn as any, args ?? {} as any) as T; }
  private async m<T = any>(fn: string, args?: any): Promise<T> { return await this.client.mutation(fn as any, args ?? {} as any) as T; }
  private async a<T = any>(fn: string, args?: any): Promise<T> { return await this.client.action(fn as any, args ?? {} as any) as T; }

  async searchDocuments(query: string) { return await this.q("documents:getSearch", { query }); }
  async getDocumentById(id: string) { return await this.q("documents:getById", { documentId: id }); }
  async getSidebarWithPreviews() { return await this.q("documents:getSidebarWithPreviews", {}); }
  async updateDocument(id: string, patch: { title?: string; content?: string }) { await this.m("documents:update", { id, ...patch }); }
  async createDocument(title: string, content?: string) { return await this.m("documents:createWithContent", { title, content: content || "" }); }
  async listAgendaInRange(input: { start: number; end: number; country?: string; holidaysStartUtc?: number; holidaysEndUtc?: number }) { return await this.q("calendar:listAgendaInRange", input); }
  async getTimelineByDocumentId(documentId: string) { return await this.q("agentTimelines:getByDocumentId", { documentId }); }
}

export function createContextStoreFromEnv(): ContextStore | null {
  const mode = (process.env.AGENTS_DATA || '').toLowerCase();
  if (mode === 'convex') {
    const url = process.env.CONVEX_URL;
    if (!url) { console.warn('[agents] Missing CONVEX_URL for ConvexContextStore'); return null; }
    const token = process.env.CONVEX_AUTH_TOKEN || process.env.AGENTS_CONVEX_TOKEN || null;
    return new ConvexContextStore(url, token);
  }
  return null;
}

