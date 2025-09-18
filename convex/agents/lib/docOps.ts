// convex/agents/lib/docOps.ts
import { Id } from "../../_generated/dataModel";
import { api, internal, api as generatedApi } from "../../_generated/api";

/**
 * Thread + document resolution helpers
 * Keep behavior identical to original implementations in aiAgents.ts.
 */
export async function getThreadSummaryDocId(ctx: any, threadId?: string): Promise<Id<"documents"> | undefined> {
  if (!threadId) return undefined;
  try {
    const thread = await ctx.runQuery(internal.aiAgents.getThreadMetadata, { threadId });
    const summary: string | undefined = (thread as any)?.summary;
    const match = summary?.match(/document:\s*([a-zA-Z0-9_-]+)/i);
    return match && match[1] ? (match[1] as Id<"documents">) : undefined;
  } catch (err) {
    // Use console.debug to avoid coupling to local logger
    console.debug("[getThreadSummaryDocId] parse error", err);
    return undefined;
  }
}

export async function firstSidebarDocId(ctx: any): Promise<Id<"documents"> | undefined> {
  const docs = await ctx.runQuery(api.documents.getSidebar);
  return docs[0]?._id;
}

export async function resolveDocumentIdByTitle(ctx: any, title: string): Promise<Id<"documents"> | undefined> {
  // Normalize strings (lowercase, unify dashes, collapse whitespace, strip common punctuation noise)
  const norm = (s: string) =>
    String(s || "")
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[\u2012-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-") // fancy dashes -> '-'
      .replace(/[\u00A0\s]+/g, " ") // collapse whitespace
      .replace(/[“”"'`]+/g, "") // quotes
      .trim();

  // Extract and normalize date variants from the query (e.g., 9/1/2025 → 09/01/2025, 2025-09-01)
  const genDateVariants = (raw: string): string[] => {
    const out = new Set<string>();
    const add = (x: string) => out.add(norm(x));
    const m = raw.match(/\b(\d{1,2})[\/\-.\s](\d{1,2})[\/\-.\s](\d{2,4})\b/);
    if (!m) return Array.from(out);
    const mm = parseInt(m[1], 10);
    const dd = parseInt(m[2], 10);
    const yy = m[3].length === 2 ? parseInt(m[3], 10) + 2000 : parseInt(m[3], 10);
    const mm2 = String(mm).padStart(2, "0");
    const dd2 = String(dd).padStart(2, "0");
    const yyyy = String(yy);
    const yy2 = String(yy % 100).padStart(2, "0");
    const bases = [
      `${mm}/${dd}/${yyyy}`,
      `${mm2}/${dd2}/${yyyy}`,
      `${mm}/${dd}/${yy2}`,
      `${mm2}-${dd2}-${yyyy}`,
      `${yyyy}-${mm2}-${dd2}`,
    ];
    for (const b of bases) add(b);
    // Common "Note <date>" prefix variants
    for (const b of bases) {
      add(`note ${b}`);
      add(`notes ${b}`);
      add(`daily note ${b}`);
    }
    return Array.from(out);
  };

  const qNorm = norm(title);
  const qDateVariants = genDateVariants(title);

  // Compute a simple score for how closely a document title matches the query
  const scoreTitle = (docTitle: string): number => {
    const d = norm(docTitle);
    if (!d) return 0;
    if (d === qNorm) return 100; // exact normalized match
    if (qDateVariants.includes(d)) return 98; // exact date-variant match
    // includes checks (prefer tighter length proximity)
    let s = 0;
    if (d.includes(qNorm)) s = Math.max(s, 85 - Math.min(20, Math.abs(d.length - qNorm.length)));
    for (const v of qDateVariants) {
      if (d.includes(v)) s = Math.max(s, 90 - Math.min(20, Math.abs(d.length - v.length)));
    }
    return s;
  };

  // 1) Try user's own sidebar documents first (fast, precise)
  const sidebarDocs: any[] = await ctx.runQuery(api.documents.getSidebar);
  let best: { id: Id<"documents">; score: number; lastModified: number } | null = null;
  for (const d of sidebarDocs) {
    const sc = scoreTitle(d.title || "");
    if (sc > 0) {
      const lm = (d as any).lastModified || d._creationTime || 0;
      if (!best || sc > best.score || (sc === best.score && lm > best.lastModified)) {
        best = { id: d._id, score: sc, lastModified: lm } as any;
      }
    }
  }
  if (best && best.score >= 80) return best.id; // confident match

  // 2) Fall back to findByTitleAny and search index for fuzzy cases
  try {
    const anyId = await ctx.runQuery(api.documents.findByTitleAny, { title });
    if (anyId) return anyId as Id<"documents">;
  } catch {}

  try {
    const results: any[] = await ctx.runQuery(api.documents.getSearch, { query: title });
    let bestSearch: { id: Id<"documents">; score: number; lastModified: number } | null = null;
    for (const d of results) {
      const sc = scoreTitle(d.title || "");
      if (sc > 0) {
        const lm = (d as any).lastModified || d._creationTime || 0;
        if (!bestSearch || sc > bestSearch.score || (sc === bestSearch.score && lm > bestSearch.lastModified)) {
          bestSearch = { id: d._id, score: sc, lastModified: lm } as any;
        }
      }
    }
    if (bestSearch && bestSearch.score >= 75) return bestSearch.id;
  } catch {}

  return undefined;
}


/**
 * Return top candidate documents by fuzzy title match with scores.
 */
export async function findTopDocumentsByTitle(
  ctx: any,
  title: string,
  limit: number = 5,
): Promise<Array<{ _id: Id<"documents">; title: string; score: number; lastModified: number }>> {
  // Keep in sync with resolveDocumentIdByTitle scoring
  const norm = (s: string) =>
    String(s || "")
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[\u2012-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
      .replace(/[\u00A0\s]+/g, " ")
      .replace(/[“”"'`]+/g, "")
      .trim();

  const genDateVariants = (raw: string): string[] => {
    const out = new Set<string>();
    const add = (x: string) => out.add(norm(x));
    const m = raw.match(/\b(\d{1,2})[\/\-.\s](\d{1,2})[\/\-.\s](\d{2,4})\b/);
    if (m) {
      const mm = parseInt(m[1], 10);
      const dd = parseInt(m[2], 10);
      const yy = m[3].length === 2 ? parseInt(m[3], 10) + 2000 : parseInt(m[3], 10);
      const mm2 = String(mm).padStart(2, "0");
      const dd2 = String(dd).padStart(2, "0");
      const yyyy = String(yy);
      const yy2 = String(yy % 100).padStart(2, "0");
      const bases = [
        `${mm}/${dd}/${yyyy}`,
        `${mm2}/${dd2}/${yyyy}`,
        `${mm}/${dd}/${yy2}`,
        `${mm2}-${dd2}-${yyyy}`,
        `${yyyy}-${mm2}-${dd2}`,
      ];
      for (const b of bases) add(b);
      for (const b of bases) {
        add(`note ${b}`);
        add(`notes ${b}`);
        add(`daily note ${b}`);
      }
    }
    return Array.from(out);
  };

  const qNorm = norm(title);
  const qDateVariants = genDateVariants(title);

  const scoreTitle = (docTitle: string): number => {
    const d = norm(docTitle);
    if (!d) return 0;
    if (d === qNorm) return 100;
    if (qDateVariants.includes(d)) return 98;
    let s = 0;
    if (d.includes(qNorm)) s = Math.max(s, 85 - Math.min(20, Math.abs(d.length - qNorm.length)));
    for (const v of qDateVariants) if (d.includes(v)) s = Math.max(s, 90 - Math.min(20, Math.abs(d.length - v.length)));
    return s;
  };

  const byId = new Map<string, { _id: Id<"documents">; title: string; score: number; lastModified: number }>();

  try {
    const sidebarDocs: any[] = await ctx.runQuery(api.documents.getSidebar);
    for (const d of sidebarDocs) {
      const score = scoreTitle(d.title || "");
      if (score > 0) {
        const existing = byId.get(String(d._id));
        const lastModified = (d as any).lastModified || d._creationTime || 0;
        const entry = { _id: d._id as Id<"documents">, title: d.title || "Untitled", score, lastModified };
        if (!existing || score > existing.score || (score === existing.score && lastModified > existing.lastModified)) {
          byId.set(String(d._id), entry);
        }
      }
    }
  } catch {}

  try {
    const results: any[] = await ctx.runQuery(api.documents.getSearch, { query: title });
    for (const d of results) {
      const score = scoreTitle(d.title || "");
      if (score > 0) {
        const existing = byId.get(String(d._id));
        const lastModified = (d as any).lastModified || d._creationTime || 0;
        const entry = { _id: d._id as Id<"documents">, title: d.title || "Untitled", score, lastModified };
        if (!existing || score > existing.score || (score === existing.score && lastModified > existing.lastModified)) {
          byId.set(String(d._id), entry);
        }
      }
    }
  } catch {}

  const all = Array.from(byId.values()).sort((a, b) => (b.score - a.score) || (b.lastModified - a.lastModified));
  return all.slice(0, Math.max(1, Math.min(limit, 10)));
}


export async function resolveDocumentId(
  ctx: any,
  args: { documentId?: string; title?: string; threadId?: string },
): Promise<Id<"documents">> {
  // Priority: explicit ID > thread summary > title > first sidebar
  if (args.documentId) return args.documentId as Id<"documents">;
  const fromThread = await getThreadSummaryDocId(ctx, args.threadId);
  if (fromThread) return fromThread;
  if (args.title) {
    const byTitle = await resolveDocumentIdByTitle(ctx, args.title);
    if (byTitle) return byTitle;
    // Do NOT silently fall back to arbitrary doc when a title was specified.
    // This could cause edits to land in the wrong note.
    throw new Error(`Document not found by title: ${args.title}`);
  }
  const first = await firstSidebarDocId(ctx);
  if (first) return first;
  throw new Error("Document not found. Provide a valid documentId or matching title.");
}

export async function storeTextAsFile(
  ctx: any,
  text: string,
  fileName: string,
  mimeType: string,
): Promise<Id<"files">> {
  const enc = new TextEncoder();
  const bytes = enc.encode(text);
  const blob = new Blob([bytes], { type: mimeType });
  const storageId = await ctx.storage.store(blob);
  const fileId: Id<"files"> = await ctx.runMutation((generatedApi as any).files.createFile, {
    storageId,
    fileName,
    fileType: "document",
    mimeType,
    fileSize: bytes.byteLength,
  });
  return fileId;
}

